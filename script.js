/* Convex lens interactive simulation
   - Drag `object`, `lens`, `screen`
   - Adjust focal length slider
   - Computes image distance using 1/f = 1/do + 1/di
*/

const svg = document.getElementById('scene');
const object = document.getElementById('object');
const lens = document.getElementById('lens');
const screen = document.getElementById('screen');
const imageGroup = document.getElementById('imageGroup');
const imageRect = document.getElementById('imageRect');
const virtualImage = document.getElementById('virtualImage');
const rays = document.getElementById('rays');
const axisGroup = document.getElementById('axisGroup');

const focal = document.getElementById('focal');
const fval = document.getElementById('fval');

// optical axis Y (global so dragging logic can use it)
const axisY = 200;

const dObjText = document.getElementById('dObj');
const dImgText = document.getElementById('dImg');
const magText = document.getElementById('mag');
const hObjText = document.getElementById('hObj');
const hImgText = document.getElementById('hImg');

fval.textContent = focal.value;

// debug overlay in page to show runtime errors
let debugDiv = document.getElementById('simDebug');
if (!debugDiv) {
  debugDiv = document.createElement('div');
  debugDiv.id = 'simDebug';
  debugDiv.style.position = 'fixed';
  debugDiv.style.right = '12px';
  debugDiv.style.bottom = '12px';
  debugDiv.style.background = 'rgba(255,255,255,0.95)';
  debugDiv.style.color = '#900';
  debugDiv.style.border = '1px solid #c88';
  debugDiv.style.padding = '6px 8px';
  debugDiv.style.fontSize = '12px';
  debugDiv.style.zIndex = 9999;
  debugDiv.style.maxWidth = '320px';
  debugDiv.style.display = 'none';
  document.body.appendChild(debugDiv);
}
function showDebug(msg){ debugDiv.style.display = msg ? 'block' : 'none'; debugDiv.textContent = msg || ''; }

function getTranslate(g) {
  const t = g.getAttribute('transform') || 'translate(0,0)';
  const m = /translate\(([-0-9.]+),\s*([-0-9.]+)\)/.exec(t);
  return m ? {x: +m[1], y: +m[2]} : {x:0,y:0};
}

function setTranslate(g, x, y) {
  g.setAttribute('transform', `translate(${x},${y})`);
}

function worldX(elem) { return getTranslate(elem).x; }
function worldY(elem) { return getTranslate(elem).y; }

function computeAndRender(){
  console.log('computeAndRender()');
  rays.innerHTML = '';
  const lensX = worldX(lens);
  const objX = worldX(object);
  const screenX = worldX(screen);
  const objTrans = getTranslate(object);
  const objHeight = 80; // px
  const objTopX = objX;
  const objTopY = axisY - objHeight; // object top (above axis)
  const objBottom = axisY; // base sits on axis
  const f = Number(focal.value);
  const pxPerCm = 10; // scale: 10 pixels == 1 cm

  // axisY is defined globally

  const do_px = lensX - objX; // object distance (positive if left)
  let di_px = null;
  let realImage = true;

  // lens formula: 1/f = 1/do + 1/di
  if (Math.abs(do_px) < 1e-6) {
    di_px = Infinity;
  } else {
    const inv = 1/f - 1/do_px;
    if (Math.abs(inv) < 1e-9) { di_px = Infinity; }
    else { di_px = 1 / inv; }
  }

  if (di_px < 0) realImage = false; // virtual image on same side as object

  // magnification
  let m = (di_px === Infinity) ? 0 : -di_px / do_px;
  const imgHeight = Math.abs(m) * objHeight;

  function pxToCm(px){ return (px/pxPerCm).toFixed(2); }

  dObjText.textContent = `物距 (do): ${do_px.toFixed(1)} px = ${pxToCm(Math.abs(do_px))} cm`;
  dImgText.textContent = `像距 (di): ${isFinite(di_px) ? di_px.toFixed(1)+' px = '+pxToCm(Math.abs(di_px))+' cm' : '∞'}`;
  magText.textContent = `放大率: ${m.toFixed(3)}`;
  hObjText.textContent = `物高: ${objHeight.toFixed(1)} px = ${pxToCm(objHeight)} cm`;
  hImgText.textContent = `像高: ${imgHeight.toFixed(1)} px = ${pxToCm(imgHeight)} cm`;

  // compute image position relative to lens
  const imageX = lensX + (isFinite(di_px) ? di_px : 1000);
  // compute image point (where rays from object top meet)
  const imageY_viaCenter = (() => {
    const dxLensToObj = lensX - objTopX || 1e-6;
    const slope = (axisY - objTopY) / dxLensToObj;
    return axisY + slope * (imageX - lensX);
  })();

  // place visual image
  if (realImage) {
    virtualImage.setAttribute('visibility','hidden');
    imageGroup.setAttribute('display','inline');
    const imgX = imageX;
    // place the real inverted image below the axis: rect should extend downward from axis
    const imgY = axisY; // group y = top of rect (axis)
    const imgElem = imageGroup.querySelector('#image');
    if (imgElem) imgElem.setAttribute('transform', `translate(${imgX},${imgY})`);
    // set rect to start at y=0 and extend downward
    imageRect.setAttribute('y', 0);
    imageRect.setAttribute('height', imgHeight);
    // ensure flame base aligns with image bottom
    const imagePointY = axisY + imgHeight;
    // position and scale flame on real image
    const imageFlame = document.getElementById('imageFlame');
    if (imageFlame) {
      const flameHeight = Math.max(6, Math.min(24, imgHeight * 0.22));
      const flameWidth = Math.max(6, Math.min(18, imgHeight * 0.08));
      // for inverted real image, flame should point down: base at rect bottom (y = imgHeight)
      const baseY = imgHeight;
      const tipY = baseY + flameHeight;
      const p1 = `0,${tipY}`;
      const p2 = `${-flameWidth/2},${baseY}`;
      const p3 = `${flameWidth/2},${baseY}`;
      imageFlame.setAttribute('points', `${p1} ${p2} ${p3}`);
    }
  } else {
    // virtual image: show on left side, dashed
    virtualImage.setAttribute('visibility','visible');
    imageGroup.setAttribute('display','none');
    // virtual image: appears on same side as object (left of lens), upright above axis
    const imgX = imageX;
    const imagePointY = imageY_viaCenter; // top of virtual image
    virtualImage.setAttribute('transform', `translate(${imgX},${imagePointY})`);
    const vrect = virtualImage.querySelector('rect');
    if (vrect) { vrect.setAttribute('y', 0); vrect.setAttribute('height', imgHeight); }
    // position and scale flame on virtual image
    const vImageFlame = document.getElementById('vImageFlame');
    if (vImageFlame) {
      const flameHeight = Math.max(6, Math.min(24, imgHeight * 0.22));
      const flameWidth = Math.max(6, Math.min(18, imgHeight * 0.08));
      // virtual image upright: flame should point up; rect top at group y, so tip above
      const baseY = 0;
      const tipY = baseY - flameHeight;
      const p1 = `0,${tipY}`;
      const p2 = `${-flameWidth/2},${baseY}`;
      const p3 = `${flameWidth/2},${baseY}`;
      vImageFlame.setAttribute('points', `${p1} ${p2} ${p3}`);
    }
  }

  // draw principal rays from top of object
  const lensTopY = axisY;

  // Ray 1: parallel to axis -> meets lens at same y, refracted to image point
  const ray1Start = {x: objTopX, y: objTopY};
  const ray1ToLens = {x: lensX, y: objTopY};

  // Ray 2: through center
  const ray2Start = {x: objTopX, y: objTopY};
  const ray2ToLens = {x: lensX, y: axisY};

  // Draw lines
  function addLine(x1,y1,x2,y2,opts={}){
    const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1',x1); ln.setAttribute('y1',y1); ln.setAttribute('x2',x2); ln.setAttribute('y2',y2);
    ln.setAttribute('stroke', opts.stroke || 'rgba(10,80,160,0.25)');
    ln.setAttribute('stroke-width', opts.w || 2);
    if (opts.dash) ln.setAttribute('stroke-dasharray', '6 4');
    rays.appendChild(ln);
  }

  // draw axis, focal points and distance brackets
  axisGroup.innerHTML = '';
  function addAxisLine(){
    const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1',0); ln.setAttribute('y1',axisY); ln.setAttribute('x2',900); ln.setAttribute('y2',axisY);
    ln.setAttribute('stroke','#444'); ln.setAttribute('stroke-width',1.6);
    axisGroup.appendChild(ln);
  }
  function addTick(x,label){
    const t = document.createElementNS('http://www.w3.org/2000/svg','line');
    t.setAttribute('x1',x); t.setAttribute('y1',axisY+6); t.setAttribute('x2',x); t.setAttribute('y2',axisY-6);
    t.setAttribute('stroke','#666'); axisGroup.appendChild(t);
    if (label){
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x',x); txt.setAttribute('y',axisY+22); txt.setAttribute('text-anchor','middle');
      txt.textContent = label; axisGroup.appendChild(txt);
    }
  }
  // addBracket: optional lineIndex moves label down to avoid overlap (lineIndex 0 = first line)
  function addBracket(x1,x2,label,lineIndex=0){
    const pad = 18;
    const lineSpacing = 16;
    const y = axisY + pad + lineIndex*lineSpacing;
    const h1 = document.createElementNS('http://www.w3.org/2000/svg','line');
    h1.setAttribute('x1',x1); h1.setAttribute('y1',y); h1.setAttribute('x2',x2); h1.setAttribute('y2',y);
    h1.setAttribute('stroke','#333'); h1.setAttribute('stroke-width',1.2);
    axisGroup.appendChild(h1);
    addTick(x1);
    addTick(x2);
    if (label){
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x',(x1+x2)/2);
      txt.setAttribute('y',y+14 + lineIndex*2);
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('fill','#111'); txt.textContent = label; axisGroup.appendChild(txt);
    }
  }

  addAxisLine();
  // focal points (label in cm)
  addTick(lensX + f, `${pxToCm(f)} cm`);
  addTick(lensX - f, `${pxToCm(f)} cm`);
  // distances: object-lens, lens-image (if real), screen-lens (labels in cm)
  const diDisplayX = imageX;
  addBracket(objX, lensX, `do=${pxToCm(Math.abs(do_px))} cm`, 0);
  if (isFinite(di_px)) addBracket(lensX, diDisplayX, `di=${pxToCm(Math.abs(di_px))} cm`, 0);
  // place screen-lens on next line to avoid overlap with di
  addBracket(lensX, screenX, `screen-lens=${pxToCm(Math.abs(screenX-lensX))} cm`, 1);

  // pre-lens: object top -> lens
  addLine(ray1Start.x, ray1Start.y, ray1ToLens.x, ray1ToLens.y);
  addLine(ray2Start.x, ray2Start.y, ray2ToLens.x, ray2ToLens.y);

  // post-lens: connect to computed image point
  const imagePointY = (isFinite(di_px)) ? imageY_viaCenter : axisY; // fallback
  if (realImage) {
    // solid rays meeting at imagePoint
    addLine(ray1ToLens.x, ray1ToLens.y, imageX, imagePointY);
    addLine(ray2ToLens.x, ray2ToLens.y, imageX, imagePointY);
  } else {
    // virtual: show dashed rays that appear to come from the virtual image point
    addLine(ray1ToLens.x, ray1ToLens.y, imageX, imagePointY, {dash:true});
    addLine(ray2ToLens.x, ray2ToLens.y, imageX, imagePointY, {dash:true});
  }

  // indicate screen location and whether it matches image plane
  const match = Math.abs(screenX - imageX) < 6;
  document.getElementById('screenSurface').setAttribute('opacity', match ? 1 : 0.9);

}

// dragging
let drag = null;
let offset = {x:0,y:0};

function startDrag(e){
  const target = e.target.closest('.draggable');
  if (!target) return;
  drag = target;
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const ctm = svg.getScreenCTM().inverse();
  const p = pt.matrixTransform(ctm);
  const t = getTranslate(drag);
  offset.x = p.x - t.x; offset.y = p.y - t.y;
}

function doDrag(e){
  if (!drag) return;
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const ctm = svg.getScreenCTM().inverse();
  const p = pt.matrixTransform(ctm);
  let nx = p.x - offset.x;
  let ny = p.y - offset.y;
  // constrain vertical dragging for lens and object
  if (drag.id === 'lens') { ny = 210; }
  if (drag.id === 'object') { ny = axisY; nx = Math.min(nx, worldX(lens)-20); }
  if (drag.id === 'screen') { ny = 40; nx = Math.max(nx, worldX(lens)+20); }
  setTranslate(drag, nx, ny);
  computeAndRender();
}

function endDrag(){ drag = null; }

svg.addEventListener('mousedown', (e)=>{ startDrag(e); });
window.addEventListener('mousemove', (e)=>{ doDrag(e); });
window.addEventListener('mouseup', endDrag);

// touch support
svg.addEventListener('touchstart', (e)=>{ startDrag(e.touches[0]); e.preventDefault(); });
window.addEventListener('touchmove', (e)=>{ doDrag(e.touches[0]); }, {passive:false});
window.addEventListener('touchend', endDrag);

// support both range and number input; update display and re-render on change
focal.addEventListener('input', ()=>{ fval.textContent = focal.value; computeAndRender(); });
focal.addEventListener('change', ()=>{ fval.textContent = focal.value; computeAndRender(); });

// initial render
computeAndRender();
