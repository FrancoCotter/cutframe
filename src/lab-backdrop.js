import { parseColor } from './palette.js';

/** Independent scenes: the adapter discovers and reads the rendered canvas itself. */
export function createLabBackdrop(page) {
  const layer = document.createElement('div');
  layer.className = 'lab-backdrop';
  layer.setAttribute('data-palette-ignore', '');
  layer.setAttribute('aria-hidden', 'true');
  layer.hidden = true;
  page.prepend(layer);
  let current = 'solid', dispose = () => {}, updateColor = () => {};
  return {
    setMode(mode, color = '#537163') {
      if (mode === current) { updateColor(color); return; }
      dispose();
      dispose = () => {};
      updateColor = () => {};
      current = mode;
      layer.replaceChildren();
      layer.hidden = mode === 'solid';
      layer.dataset.mode = mode;
      delete layer.dataset.renderer;
      if (mode === 'solid') { page.removeAttribute('data-cutframe-backdrop'); return; }
      page.setAttribute('data-cutframe-backdrop', 'dynamic');
      const canvas = document.createElement('canvas');
      canvas.id = 'lab-scene';
      layer.append(canvas);
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      let frame = 0, x = 0, y = 0;
      const move = event => { x = event.clientX / innerWidth - .5; y = .5 - event.clientY / innerHeight; };
      let render;
      let cleanup = () => {};
      if (mode === 'liquid') {
        layer.dataset.renderer = 'canvas-2d';
        const context = canvas.getContext('2d', { alpha: false });
        render = now => {
          const t = now / 12000;
          context.fillStyle = '#403a58';
          context.fillRect(0, 0, canvas.width, canvas.height);
          const blobs = [['#bd7c86', .25, .35, .2], ['#8b78aa', .75, .6, 1.8], ['#77a5a4', .55, .2, 3.8]];
          for (const [tint, bx, by, phase] of blobs) {
            const cx = (bx + Math.sin(t + phase) * .23) * canvas.width;
            const cy = (by + Math.cos(t * .8 + phase) * .24) * canvas.height;
            const radius = Math.max(canvas.width, canvas.height) * .8;
            const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient.addColorStop(0, tint);
            gradient.addColorStop(1, tint + '00');
            context.fillStyle = gradient;
            context.fillRect(0, 0, canvas.width, canvas.height);
          }
        };
      } else {
        const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
        if (!gl) { layer.dataset.renderer = 'unavailable'; canvas.remove(); return; }
        layer.dataset.renderer = 'webgl';
        const shaders = [];
        const compile = (type, source) => {
          const shader = gl.createShader(type);
          shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader); return shader;
        };
        const program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}'));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
          precision mediump float;
          uniform vec2 size; uniform vec2 pointer; uniform float time; uniform float variant; uniform vec3 solidColor;
          void main(){
            vec2 uv=(gl_FragCoord.xy-.5*size)/min(size.x,size.y);
            vec3 color;
            if(variant<.5){ color=solidColor; }
            else if(variant>4.5){ color=vec3(.008,.008,.008); }
            else if(variant>3.5){ color=vec3(.97,.97,.97); }
            else if(variant>2.5){
              vec3 ro=vec3(pointer.x*1.8,pointer.y,3.0); vec3 rd=normalize(vec3(uv,-1.4));
              vec3 center=vec3(sin(time*.12)*.35,0.,0.); vec3 oc=ro-center;
              float b=dot(oc,rd); float h=b*b-dot(oc,oc)+1.;
              color=mix(vec3(.12,.18,.26),vec3(.33,.43,.52),clamp(uv.y+.5,0.,1.));
              if(h>0.){
                float hit=-b-sqrt(h); vec3 normal=normalize(ro+rd*hit-center);
                vec3 light=normalize(vec3(-.7,1.,2.)); float diffuse=max(0.,dot(normal,light));
                float shine=pow(max(0.,dot(reflect(-light,normal),-rd)),28.);
                color=vec3(.36,.57,.62)*(.25+.75*diffuse)+vec3(.7)*shine;
              }
            } else if(variant>1.5){
              float cell=mod(floor(uv.x*8.)+floor(uv.y*8.),2.);
              color=mix(vec3(.06,.07,.12),vec3(.94,.77,.48),cell);
            } else {
              uv+=pointer*.12;
              float depth=1./(.35+length(uv));
              float wave=sin(uv.x*7.+time*.25+sin(uv.y*5.-time*.2));
              float bands=.5+.5*sin(depth*5.+wave-time*.35);
              color=mix(vec3(.035,.12,.35),vec3(.62,.24,.42),smoothstep(.05,.95,bands));
              color=mix(color,vec3(.82,.66,.30),.35*(.5+.5*cos(wave+time*.2)));
            }
            gl_FragColor=vec4(color,1.);
          }`));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program);
          layer.dataset.renderer = 'unavailable'; canvas.remove(); return;
        }
        gl.useProgram(program);
        const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        const size = gl.getUniformLocation(program, 'size'), time = gl.getUniformLocation(program, 'time');
        const pointer = gl.getUniformLocation(program, 'pointer'), solid = gl.getUniformLocation(program, 'solidColor');
        const variant = { 'webgl-solid': 0, webgl: 1, 'webgl-contrast': 2, 'webgl-model': 3, 'webgl-light': 4, 'webgl-dark': 5 }[mode] ?? 1;
        gl.uniform1f(gl.getUniformLocation(program, 'variant'), variant);
        let tint = parseColor(color);
        updateColor = value => { tint = parseColor(value) || tint; };
        render = now => {
          gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(size, canvas.width, canvas.height);
          gl.uniform2f(pointer, x, y); gl.uniform1f(time, now / 1000);
          gl.uniform3f(solid, tint.r / 255, tint.g / 255, tint.b / 255); gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
        cleanup = () => {
          gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(shader => gl.deleteShader(shader));
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
      }
      const draw = now => {
        const width = Math.min(900, Math.round(innerWidth)), height = Math.round(width * innerHeight / innerWidth);
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        render(motion.matches ? 0 : now);
        frame = 0;
        // A static scene is still rendered for readback without preserving its WebGL buffer.
        if (!document.hidden) frame = requestAnimationFrame(draw);
      };
      const resume = () => { cancelAnimationFrame(frame); frame = 0; if (!document.hidden) frame = requestAnimationFrame(draw); };
      page.addEventListener('pointermove', move); document.addEventListener('visibilitychange', resume);
      window.addEventListener('resize', resume); motion.addEventListener('change', resume); resume();
      dispose = () => {
        cancelAnimationFrame(frame); page.removeEventListener('pointermove', move);
        document.removeEventListener('visibilitychange', resume); window.removeEventListener('resize', resume);
        motion.removeEventListener('change', resume); cleanup();
      };
    },
  };
}
