# Clippy.JS (Enhanced Version)

Add Clippy or his friends to any website for instant nostalgia. This version is a modernized fork with several enhancements over the [original project](https://github.com/clippyjs/clippy.js).

## New Features in this Fork

- **Text-to-Speech (TTS):** Agents can now speak using the browser's native Speech Synthesis API.
- **Touch & Mobile Support:** Improved event handling for touch devices, including long-press for context menus and better dragging on mobile.
- **Interactive Balloons:** New `ask` method to get user input directly through Clippy's speech balloon.
- **Extensions Library:** A suite of convenience methods for animations, emotions, and personality-driven behavior.
- **Decoupled Architecture:** Cleanly separated source files in `src/` for better maintainability.

## Usage: Setup

Add the stylesheet to your head:
```html
<link rel="stylesheet" type="text/css" href="clippy.css" media="all">
```

Add the scripts to the bottom of the page (requires jQuery 1.7+):
```html
<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- Clippy.js (Bundled) -->
<script src="clippy.js"></script>

<!-- Optional: Extensions -->
<script src="clippy_extensions_complete.js"></script>

<!-- Init script -->
<script type="text/javascript">
    clippy.load('Clippy', function(agent){
        agent.show();
        agent.speak('Hello! I have been upgraded with TTS and touch support.');
    });
</script>
```

## Usage: Enhanced Actions

This fork adds several powerful methods to the `agent` instance:

### Text-to-Speech
```javascript
// Enable TTS
agent.setTTSEnabled(true);

// Set recommended voice based on agent name
agent.setRecommendedVoice();

// Speak with TTS
agent.speak('I can talk now!', false, true);
```

### User Interaction
```javascript
// Ask the user a question
agent.ask({
    title: 'Question',
    placeholder: 'Type here...',
    onAsk: (value) => {
        agent.speak('You said: ' + value);
    }
});
```

### Personalities & Emotions (via Extensions)
```javascript
agent.setPersonality('sarcastic');
agent.greetWithPersonality();

agent.speakWithEmotion('I am so excited!', 'excited');
```

## Standard Actions

```javascript
// play a given animation
agent.play('Searching');

// play a random animation
agent.animate();

// get a list of all the animations
agent.animations();

// Show text balloon (visual only)
agent.speak('My name is Clippy.');

// move to the given point
agent.moveTo(100,100);

// gesture at a given point
agent.gestureAt(200,200);

// stop the current action
agent.stopCurrent();

// stop all actions
agent.stop();
```

## Development

If you wish to use the modular source files instead of the bundled `clippy.js`, you can load them individually:

```html
<script src="src/agent.js"></script>
<script src="src/animator.js"></script>
<script src="src/balloon.js"></script>
<script src="src/load.js"></script>
<script src="src/queue.js"></script>
```

See `demo_src.html` in the root directory for a complete example using source files.

## Special Thanks
* The awesome [Cinnamon Software](http://www.cinnamonsoftware.com/) for developing [Double Agent](http://doubleagent.sourceforge.net/) the program used to unpack Clippy and his friends!
* Microsoft, for creating clippy :)
