
/******
 *
 *
 * @constructor
 */
clippy.Balloon = function (targetEl) {
  this._targetEl = targetEl;

  this._hidden = true;
  this._ttsEnabled = !!window.speechSynthesis;
  this._ttsUserEnabled = this._ttsEnabled;
  this._isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  this._ttsOptions = {
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  };
  this._currentUtterance = null;
  this._setup();
};

clippy.Balloon.prototype = {
  WORD_SPEAK_TIME: 320,
  CLOSE_BALLOON_DELAY: 2000,

  _setup: function () {
    this._balloon = $(
      '<div class="clippy-balloon"><div class="clippy-tip"></div><div class="clippy-content"></div></div> ',
    ).hide();
    this._content = this._balloon.find(".clippy-content");

    $(document.body).append(this._balloon);
  },

  reposition: function () {
    var sides = ["top-left", "top-right", "bottom-left", "bottom-right"];

    for (var i = 0; i < sides.length; i++) {
      var s = sides[i];
      this._position(s);
      if (!this._isOut()) break;
    }
  },

  _BALLOON_MARGIN: 15,

  /***
   *
   * @param side
   * @private
   */
  _position: function (side) {
    var o = this._targetEl.offset();
    var h = this._targetEl.height();
    var w = this._targetEl.width();

    var bH = this._balloon.outerHeight();
    var bW = this._balloon.outerWidth();

    this._balloon.removeClass("clippy-top-left");
    this._balloon.removeClass("clippy-top-right");
    this._balloon.removeClass("clippy-bottom-right");
    this._balloon.removeClass("clippy-bottom-left");

    var left, top;
    switch (side) {
      case "top-left":
        // right side of the balloon next to the right side of the agent
        left = o.left + w - bW;
        top = o.top - bH - this._BALLOON_MARGIN;
        break;
      case "top-right":
        // left side of the balloon next to the left side of the agent
        left = o.left;
        top = o.top - bH - this._BALLOON_MARGIN;
        break;
      case "bottom-right":
        // right side of the balloon next to the right side of the agent
        left = o.left;
        top = o.top + h + this._BALLOON_MARGIN;
        break;
      case "bottom-left":
        // left side of the balloon next to the left side of the agent
        left = o.left + w - bW;
        top = o.top + h + this._BALLOON_MARGIN;
        break;
    }

    this._balloon.css({ top: top, left: left });
    this._balloon.addClass("clippy-" + side);
  },

  _isOut: function () {
    var o = this._balloon.offset();
    var bH = this._balloon.outerHeight();
    var bW = this._balloon.outerWidth();

    var wW = $(window).width();
    var wH = $(window).height();
    var sT = $(document).scrollTop();
    var sL = $(document).scrollLeft();

    var top = o.top - sT;
    var left = o.left - sL;
    var m = 5;
    if (top - m < 0 || left - m < 0) return true;
    if (top + bH + m > wH || left + bW + m > wW) return true;

    return false;
  },

  showHtml: function (html, hold) {
    const self = this;
    this._hidden = false;
    // Set visibility to hidden and position off-screen to calculate dimensions
    this._balloon.css({
      visibility: 'hidden',
      top: '-9999px',
      left: '-9999px'
    });
    this.show(); // This sets display: block

    const c = this._content;
    c.height('auto');
    c.width('auto');
    c.html(html);

    // Use a nested requestAnimationFrame to ensure rendering is complete
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        self.reposition();
        self._balloon.css('visibility', 'visible');
        // Restore state management
        self._active = true;
        self._hold = hold;
      });
    });
  },

  speak: function (complete, text, hold, useTTS) {
    this._hidden = false;
    this.show();
    var c = this._content;
    // set height to auto
    c.height("auto");
    c.width("auto");
    // add the text
    c.text(text);
    // set height
    c.height(c.height());
    c.width(c.width());
    c.text("");
    this.reposition();

    this._complete = complete;
    var self = this;

    // Use TTS if requested and available, otherwise fall back to visual-only
    if (useTTS && this._ttsEnabled) {
      // Handle asynchronous voice loading in browsers like Chrome mobile.
      var voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // If voices are not available, wait a moment for them to load.
        window.setTimeout(function () {
          var voices = window.speechSynthesis.getVoices();
          if (voices.length === 0) {
            // If still no voices, fall back to silent words.
            self._sayWords(text, hold, complete);
          } else {
            // Voices loaded, proceed with TTS.
            self._sayWordsWithTTS(text, hold, complete);
          }
        }, 250); // 250ms delay is a pragmatic workaround for the voice loading race condition.
      } else {
        // Voices were available immediately.
        this._sayWordsWithTTS(text, hold, complete);
      }
    } else {
      this._sayWords(text, hold, complete);
    }
  },

  show: function () {
    if (this._hidden) return;
    this._balloon.show();
  },

  hide: function (fast) {
    if (fast) {
      this._balloon.hide();
      return;
    }

    this._hiding = window.setTimeout(
      $.proxy(this._finishHideBalloon, this),
      this.CLOSE_BALLOON_DELAY,
    );
  },

  _finishHideBalloon: function () {
    if (this._active) return;
    this._balloon.hide();
    this._hidden = true;
    this._hiding = null;
  },

  isAnimating: function () {
    return this._active;
  },

  _sayWords: function (text, hold, complete) {
    this._active = true;
    this._hold = hold;
    var words = text.split(/[^\S-]/);
    var time = this.WORD_SPEAK_TIME;
    var el = this._content;
    var idx = 1;

    this._addWord = $.proxy(function () {
      if (!this._active) return;
      if (idx > words.length) {
        this._active = false;
        if (!this._hold) {
          complete();
          this.hide();
        }
      } else {
        el.text(words.slice(0, idx).join(" "));
        idx++;
        this._loop = window.setTimeout($.proxy(this._addWord, this), time);
      }
    }, this);

    this._addWord();
  },

  _sayWordsWithTTS: function (text, hold, complete) {
    this._active = true;
    this._hold = hold;
    var words = text.split(/[^\S-]/);
    var el = this._content;
    var idx = 1;
    var self = this;

    // --- Mobile Fallback ---
    // Use a timer-based approach on mobile because the 'onboundary' event is unreliable.
    if (this._isMobile) {
      // Define the onEnd callback for TTS
      var onEnd = function () {
        // Ensure the timer is cleared and all text is displayed
        if (self._mobileTTSTimer) {
          window.clearTimeout(self._mobileTTSTimer);
          self._mobileTTSTimer = null;
        }
        el.text(words.join(" "));

        self._active = false;
        if (!self._hold) {
          complete();
          self.hide();
        }
      };

      // Start TTS audio playback
      this._speakTTS(text, null, onEnd);

      // --- Simulated Word Streaming ---
      // Calculate word display speed based on TTS rate
      var timePerWord = (this.WORD_SPEAK_TIME / (this._ttsOptions.rate || 1.0));

      var addWord = function () {
        if (!self._active) return; // Stop if speech was cancelled
        if (idx > words.length) {
          // Stop when all words are displayed; TTS onEnd will handle completion.
          return;
        }
        el.text(words.slice(0, idx).join(" "));
        idx++;
        self._mobileTTSTimer = window.setTimeout(addWord, timePerWord);
      };

      addWord();
      return; // Exit, preventing desktop logic from running
    }

    // --- Desktop Logic (onboundary-based with timer fallback) ---
    var boundaryEventsReceived = 0;
    var lastBoundaryTime = Date.now();

    // Clear any existing fallback timer
    if (this._ttsFallbackTimer) {
      window.clearTimeout(this._ttsFallbackTimer);
      this._ttsFallbackTimer = null;
    }

    // Start fallback timer in case boundary events don't work (Chrome issue)
    var startFallbackTimer = function () {
      var timePerWord = (self.WORD_SPEAK_TIME / (self._ttsOptions.rate || 1.0)) * 1.2; // Slightly slower to be safe

      var addWord = function () {
        if (!self._active) return; // Stop if speech was cancelled
        if (idx > words.length) return;

        el.text(words.slice(0, idx).join(" "));
        idx++;

        if (idx <= words.length) {
          self._ttsFallbackTimer = window.setTimeout(addWord, timePerWord);
        }
      };

      // Start fallback after a short delay to allow boundary events to take precedence
      self._ttsFallbackTimer = window.setTimeout(addWord, 300);
    };

    this._speakTTS(text,
      // onWord callback
      function (charIndex, spokenWords) {
        boundaryEventsReceived++;
        lastBoundaryTime = Date.now();

        var currentWordIndex = 0;
        var charCount = 0;
        for (var i = 0; i < spokenWords.length; i++) {
          charCount += spokenWords[i].length + 1;
          if (charIndex < charCount) {
            currentWordIndex = i;
            break;
          }
        }
        if (currentWordIndex + 1 > idx) {
          idx = currentWordIndex + 1;
          el.text(words.slice(0, idx).join(" "));
        }
      },
      // onEnd callback
      function () {
        // Clear any pending fallback timer
        if (self._ttsFallbackTimer) {
          window.clearTimeout(self._ttsFallbackTimer);
          self._ttsFallbackTimer = null;
        }

        el.text(words.join(" "));
        self._active = false;
        if (!self._hold) {
          complete();
          self.hide();
        }
      }
    );

    // Start fallback timer for browsers that don't fire boundary events reliably
    startFallbackTimer();
  },

  close: function () {
    if (this._active) {
      this._hold = false;
    } else if (this._hold) {
      this._complete();
    }
  },

  pause: function () {
    window.clearTimeout(this._loop);
    if (this._hiding) {
      window.clearTimeout(this._hiding);
      this._hiding = null;
    }
    // Clear TTS fallback timer if active
    if (this._ttsFallbackTimer) {
      window.clearTimeout(this._ttsFallbackTimer);
      this._ttsFallbackTimer = null;
    }
  },

  resume: function () {
    if (this._addWord) this._addWord();
    this._hiding = window.setTimeout(
      $.proxy(this._finishHideBalloon, this),
      this.CLOSE_BALLOON_DELAY,
    );
  },

  /**************************** TTS Functionality ************************************/

  /**
   * Configure TTS settings
   * @param {Object} options - TTS configuration options
   * @param {SpeechSynthesisVoice} options.voice - Voice to use
   * @param {Number} options.rate - Speech rate (0.1 to 10)
   * @param {Number} options.pitch - Speech pitch (0 to 2)
   * @param {Number} options.volume - Speech volume (0 to 1)
   */
  setTTSOptions: function (options) {
    if (!this._ttsEnabled) return false;

    this._ttsOptions = $.extend({}, this._ttsOptions, options);
    return true;
  },

  /**
   * Get available TTS voices
   * @returns {Array} Array of available voices
   */
  getTTSVoices: function () {
    if (!this._ttsEnabled) return [];
    return window.speechSynthesis.getVoices();
  },

  /**
   * Check if TTS is supported and enabled
   * @returns {Boolean}
   */
  isTTSEnabled: function () {
    return this._ttsUserEnabled;
  },

  setTTSEnabled: function (enabled) {
    this._ttsUserEnabled = this._ttsEnabled && enabled;
  },

  /**
   * Stop current TTS utterance
   */
  stopTTS: function () {
    if (this._currentUtterance && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      this._currentUtterance = null;
    }
  },

  /**
   * Speak text using TTS (synchronized with visual word streaming)
   * @param {String} text - Text to speak
   * @param {Function} onWord - Callback fired for each word boundary
   * @param {Function} onEnd - Callback fired when speech ends
   */
  _speakTTS: function (text, onWord, onEnd) {
    if (!this._ttsEnabled || !text) {
      if (onEnd) onEnd();
      return;
    }

    // Stop any current speech
    this.stopTTS();

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this._ttsOptions.rate;
    utterance.pitch = this._ttsOptions.pitch;
    utterance.volume = this._ttsOptions.volume;

    if (this._ttsOptions.voice) {
      utterance.voice = this._ttsOptions.voice;
    }

    // Track word boundaries for synchronization
    var words = text.split(/[^\S-]/);
    var currentWordIndex = 0;
    var wordStartTime = 0;
    var estimatedWordDuration = (utterance.rate > 0) ? (words.join(' ').length / utterance.rate / 10) : 0;

    utterance.onboundary = function (event) {
      if (event.name === 'word' && onWord) {
        onWord(event.charIndex, words);
      }
    };

    utterance.onend = function () {
      if (onEnd) onEnd();
    };

    utterance.onerror = function (event) {
      console.warn('TTS Error:', event.error);
      if (onEnd) onEnd();
    };

    this._currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  },
};

