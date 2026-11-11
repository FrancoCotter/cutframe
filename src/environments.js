export const environments = {
  lab: {
    name: 'Style Lab', color: '#eceee8',
    top: `<div class="lab-intro environment-layout"><p class="lab-eyebrow">THE ADAPTATION PLAYGROUND / 04</p><h1>Your style.<br><em>The same player.</em></h1><p>Change the page. Watch the frame follow.<br>One live player, an open-ended style test.</p></div>`,
    bottom: `<div class="lab-bottom environment-layout"><div class="lab-specimen"><span class="lab-eyebrow">THE HOST PAGE</span><h2>A different point of view.</h2><p>This text shares the page’s font, weight and style. Links and buttons supply its accent. The player reads these rendered styles and chooses a readable palette.</p><a href="#player-mount">Watch the film ↗</a><a class="lab-sample-button" href="#player-mount">A little more motion ↗</a></div><section id="lab-results" class="lab-results" aria-label="Live adaptation results" data-palette-ignore></section></div>`,
  },
  paper: {
    name: 'Journal', color: '#f2eee4',
    top: `<div class="journal-top environment-layout">
      <header class="journal-header"><a href="#journal-about" class="journal-logo">FORME<sup>®</sup></a><span>A journal of the things we notice.</span><nav aria-label="Journal navigation"><a href="#journal-notes">Field notes</a><a href="#player-mount">Watch the film ↗</a></nav></header>
      <div class="journal-hero"><div><p class="journal-kicker">FIELD NOTES — VOLUME 08</p><h1>Between<br><em>worlds.</em></h1></div><div class="journal-intro"><span class="journal-dash"></span><p>Every future starts<br>with a human story.</p><a class="journal-link" href="#journal-notes">Read the field notes ↗</a></div><aside class="journal-edition"><span>08</span><p>THE CITY<br>ISSUE</p><span class="journal-dot"></span></aside></div>
    </div>`,
    bottom: `<div class="journal-bottom environment-layout">
      <div class="journal-byline"><span>TEARS OF STEEL / AN OPEN MOVIE</span><span>FIELD NOTES, VOLUME 08</span></div>
      <section id="journal-notes" class="journal-notes"><div><p class="journal-kicker">A CLOSER LOOK</p><h2>Small observations.<br>Wider worlds.</h2></div><article><span class="journal-number">01</span><h3>Look beyond the skyline.</h3><p>A city can be a setting, a character, or a memory. Notice how the image holds all three.</p><a href="#player-mount">Return to the film ↗</a></article><article><span class="journal-number">02</span><h3>Look between things.</h3><p>Quiet conversations and impossible scenes share the same frame. Watch how light connects them.</p><a href="#journal-about">About this journal ↗</a></article></section>
      <footer id="journal-about" class="journal-about"><span>FORME — AN INDEPENDENT JOURNAL</span><p>Collected slowly.<br>Shared with curiosity.</p><a class="journal-button" href="#player-mount">Watch again ↗</a></footer>
    </div>`,
  },
  punch: {
    name: 'Studio', color: '#ee563d',
    top: `<div class="studio-top environment-layout">
      <header class="studio-header"><a href="#studio-notes" class="studio-logo">OFF—GRID</a><nav aria-label="Studio navigation"><a href="#studio-programme">WHAT WE MAKE</a><a href="#studio-notes">STUDIO NOTES</a><a class="studio-header-button" href="#player-mount">PLAY SOMETHING ↗</a></nav></header>
      <div class="studio-hero"><div class="studio-title"><div class="studio-tags"><span class="studio-tag">INDEPENDENT BY DESIGN</span><span>FILM / FORM / SOUND</span></div><h1>MAKE<br><span>IT MOVE.</span></h1></div><aside class="studio-side"><div class="studio-sticker">GOOD<br>THINGS<br>OFF SCRIPT.</div><p>Images with a pulse.<br>Ideas with somewhere to go.</p></aside></div>
      <div class="studio-bottom-line"><span>NOW PLAYING: TEARS OF STEEL</span><span>A LITTLE LESS ORDINARY ↗</span></div>
    </div>`,
    bottom: `<div class="studio-bottom environment-layout">
      <div class="studio-marquee" aria-hidden="true"><span>MAKE A LITTLE NOISE.</span><span>STAY OFF—GRID.</span><span>MAKE A LITTLE NOISE.</span></div>
      <section id="studio-programme" class="studio-programme"><div class="studio-section-head"><span>THE PROGRAMME</span><p>Different forms.<br>Same restless energy.</p></div><a class="studio-card studio-card-blue" href="#player-mount"><span>01 / MOVING IMAGE</span><h2>LET IT<br>ROLL.</h2><span>WATCH THE FILM ↗</span></a><a class="studio-card studio-card-cream" href="#studio-notes"><span>02 / VISUAL CULTURE</span><h2>THINK<br>SIDEWAYS.</h2><span>READ THE NOTES ↗</span></a></section>
      <footer id="studio-notes" class="studio-notes"><span>OFF—GRID IS A FICTIONAL CREATIVE STUDIO.</span><h2>LESS OF<br>THE SAME.</h2><p>A space for moving images and unexpected combinations. This page is a design environment for the Cutframe study.</p></footer>
    </div>`,
  },
  night: {
    name: 'Cinema', color: '#10151f',
    top: `<div class="cinema-top environment-layout">
      <header class="cinema-header"><a href="#cinema-notes" class="cinema-logo">nocturne<span>◎</span></a><span>A PRIVATE SCREENING</span><a href="#cinema-notes">Film notes</a></header>
      <div class="cinema-hero"><p>LEAVE A LITTLE ROOM FOR WONDER.</p><h1>Watch.<br><em>Disappear.</em></h1><span class="cinema-line"></span></div>
    </div>`,
    bottom: `<div class="cinema-bottom environment-layout"><section id="cinema-notes" class="cinema-notes"><span class="cinema-index">01 / TEARS OF STEEL</span><p>Nothing to finish.<br>Only something to see.</p><a href="#player-mount">Back to the film ↗</a></section><footer class="cinema-footer"><span>NOCTURNE / A STUDY IN STILLNESS</span><span>LIGHTS DOWN. EYES OPEN.</span></footer></div>`,
  },
};
