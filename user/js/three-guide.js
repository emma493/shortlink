/* ==========================================
   Shortlink — CSS Girl Guide (No 3D Model Needed)
   
   DOM-based romantic face that:
   - Speaks Pro Tips via Web Speech API (TTS)
   - Reacts to scroll (blush, smile, shy)
   - Points to ads when guiding
   - Celebrates with floating hearts when tasks complete
   - Works on all devices, no external model file
   ========================================== */

(function () {
  /* --- State --- */
  let synth = window.speechSynthesis;
  let isSpeaking = false;
  let currentUtterance = null;
  let heartParticles = [];
  let animationFrame = null;

  /* --- DOM Elements --- */
  let faceWrap, face, leftEye, rightEye, mouth, blushL, blushR, head;

  /* --- Init --- */
  function init() {
    createFaceDOM();

    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);

    onScroll();
    animate();

    // Expose API
    window.shortlinkGuide = {
      speak: (text) => speak(text),
      speakQueued: (texts) => speakQueued(texts),
      guideToAd: (adName) => guideToAd(adName),
      celebrate: () => celebrate(),
      idle: () => { /* CSS handles idle breathing */ },
      destroy: () => {
        if (synth) synth.cancel();
        if (faceWrap && faceWrap.parentNode) faceWrap.parentNode.removeChild(faceWrap);
        if (animationFrame) cancelAnimationFrame(animationFrame);
      }
    };
  }

  /* --- Create Face DOM --- */
  function createFaceDOM() {
    faceWrap = document.createElement('div');
    faceWrap.className = 'girl-wrap';

    faceWrap.innerHTML = `
      <div class="girl-face" id="girl-face">
        <div class="girl-hair"></div>
        <div class="girl-head" id="girl-head">
          <div class="girl-eye left" id="left-eye">
            <div class="girl-pupil"></div>
          </div>
          <div class="girl-eye right" id="right-eye">
            <div class="girl-pupil"></div>
          </div>
          <div class="girl-bush L" id="blushL"></div>
          <div class="girl-bush R" id="blushR"></div>
          <div class="girl-mouth" id="girl-mouth">
            <div class="girl-lip top"></div>
            <div class="girl-lip bottom"></div>
            <div class="girl-tongue"></div>
          </div>
        </div>
        <div class="girl-neck"></div>
      </div>
      <div class="girl-label">Shortlink Guide</div>
    `;

    document.body.appendChild(faceWrap);

    face = document.getElementById('girl-face');
    head = document.getElementById('girl-head');
    leftEye = document.getElementById('left-eye');
    rightEye = document.getElementById('right-eye');
    blushL = document.getElementById('blushL');
    blushR = document.getElementById('blushR');
    const mouthWrap = document.getElementById('girl-mouth');
    const lips = mouthWrap.querySelectorAll('.girl-lip');
    const tongue = mouthWrap.querySelector('.girl-tongue');
  }

  /* --- Expressions --- */
  function setExpression(type) {
    if (!face) return;

    face.className = 'girl-face';
    face.classList.add(type);

    // Head tilt
    if (head) {
      head.style.transition = 'transform 0.6s ease';
      switch (type) {
        case 'shy': head.style.transform = 'rotateZ(12deg)'; break;
        case 'blush': head.style.transform = 'rotateZ(-8deg)'; break;
        case 'happy': head.style.transform = 'rotateZ(0deg)'; break;
        default: head.style.transform = 'rotateZ(0deg)'; break;
      }
    }
  }

  function setMouthOpen(open) {
    const topLip = document.querySelector('.girl-lip.top');
    const bottomLip = document.querySelector('.girl-lip.bottom');
    const tongue = document.querySelector('.girl-tongue');
    if (!topLip || !bottomLip) return;

    if (open) {
      topLip.style.transform = 'translateY(-6px) scaleY(0.7)';
      bottomLip.style.transform = 'translateY(6px) scaleY(0.7)';
      if (tongue) tongue.style.opacity = '0.6';
    } else {
      topLip.style.transform = 'translateY(0) scaleY(1)';
      bottomLip.style.transform = 'translateY(0) scaleY(1)';
      if (tongue) tongue.style.opacity = '0';
    }
  }

  /* --- Scroll Reaction --- */
  function onScroll() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const maxScroll = docHeight > 0 ? docHeight : 1;
    const progress = window.scrollY / maxScroll;

    if (!face) return;

    if (progress < 0.25) setExpression('idle');
    else if (progress < 0.5) setExpression('shy');
    else if (progress < 0.75) setExpression('blush');
    else setExpression('happy');
  }

  function onResize() {
    // No-op for now, face is CSS-positioned
  }

  /* --- TTS --- */
  function speak(text) {
    if (!synth) return;

    if (currentUtterance) {
      synth.cancel();
      currentUtterance = null;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.15;
    utter.volume = 1;
    utter.lang = 'en-US';

    const voices = synth.getVoices();
    const female = voices.find(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('hazel') ||
      v.name.includes('Samantha') ||
      v.name.includes('Karen')
    ) || voices[0];
    if (female) utter.voice = female;

    utter.onstart = () => {
      isSpeaking = true;
      currentUtterance = utter;
      setMouthOpen(true);
      startMouthAnimation();
    };

    utter.onend = () => {
      isSpeaking = false;
      currentUtterance = null;
      setMouthOpen(false);
      stopMouthAnimation();
    };

    utter.onerror = () => {
      isSpeaking = false;
      currentUtterance = null;
      setMouthOpen(false);
      stopMouthAnimation();
    };

    synth.speak(utter);
    currentUtterance = utter;
  }

  function speakQueued(texts) {
    if (!texts || texts.length === 0) return;
    const first = texts.shift();
    speak(first);
    currentUtterance.onend = () => {
      if (texts.length) speakQueued(texts);
    };
  }

  let mouthFrame = null;
  function startMouthAnimation() {
    if (mouthFrame) return;
    let open = false;
    mouthFrame = requestAnimationFrame(function loop() {
      if (!isSpeaking) {
        mouthFrame = null;
        setMouthOpen(false);
        return;
      }
      open = !open;
      setMouthOpen(open);
      mouthFrame = requestAnimationFrame(loop);
    });
  }

  function stopMouthAnimation() {
    if (mouthFrame) {
      cancelAnimationFrame(mouthFrame);
      mouthFrame = null;
    }
    setMouthOpen(false);
  }

  /* --- Guide to Ad --- */
  function guideToAd(adName) {
    const msgs = [
      `Please click on the ${adName} advertisement.`,
      `Spend a few seconds on the advertiser's website, then come back here.`,
      "I'll be waiting for you."
    ];
    speakQueued(msgs);

    if (head) {
      head.style.transition = 'transform 0.5s ease';
      head.style.transform = 'rotateZ(-15deg) rotateY(15deg)';
    }

    setExpression('happy');
  }

  /* --- Celebrate --- */
  function celebrate() {
    speak("Wonderful! You completed all the tasks. Your link is ready.");
    spawnHearts(25);
  }

  /* --- Heart Particles (CSS DOM) --- */
  function spawnHearts(count = 20) {
    const body = document.body;
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('div');
      heart.className = 'guide-heart';
      heart.innerHTML = '💖';
      heart.style.left = (40 + Math.random() * 20) + '%';
      heart.style.top = '60%';
      heart.style.fontSize = (12 + Math.random() * 12) + 'px';
      heart.style.position = 'fixed';
      heart.style.zIndex = '9999';
      heart.style.pointerEvents = 'none';
      heart.style.transition = 'all 1.5s ease-out';
      body.appendChild(heart);

      const dx = (Math.random() - 0.5) * 100;
      const dy = -100 - Math.random() * 100;

      // Force reflow then animate
      requestAnimationFrame(() => {
        heart.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 360}deg)`;
        heart.style.opacity = '0';
      });

      setTimeout(() => heart.remove(), 1800);
    }
  }

  function animate() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animate);
    // Idle breathing is handled by CSS animation on .girl-face
  }

  // Auto init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
