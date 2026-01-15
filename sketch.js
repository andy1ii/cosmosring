/**
 * Cosmos Circular Ring (KINETIC RING)
 * Font Updated: ABCOracle-Book.otf
 */

let mode = 4; 
let imgs = [];
let totalImages = 6;
let nodes = [];

// Shared Variables
let globeRotation = 0;
let lastSwitchFrame = 0;
let switchInterval = 60;

let autoShuffle = false; 
let uploadCounter = 0;
let isResetting = false;

// Camera control
let camRotX = 0;
let camRotY = 0;
let camDist = 2000;
let prevMouseX, prevMouseY;
let isDragging = false;

// Export state flags
let exportRatio = 1;
let isExporting = false;
let aspectMultiplier = 1;

// Video Recording Variables
let recorder;
let isRecording = false;
let recordingDuration = 300;
let recordingStartFrame = 0;
let isVideoExport = false;

// UI Variables
let uploadInput;
let exportSelect;
let exportBtn;
let recordBtn;

// --- GADGET UI VARS ---
let gadgetContainer; 
let pillInput;          
let pillDisplayText;  
let pillCounter;        

// --- 2D OVERLAY BUFFER ---
let overlayPG; 

// --- CONTROLS ---
let perspectiveSlider, perspLabel; 
let isTicking = false;
let tickBtn;

// --- TOP NAV VARS ---
let modeButtons = [];

// UI Visibility Toggle
let isUIVisible = true;

// --- UPDATED FONT CONFIGURATION ---
const FONT_NAME = 'ABCOracleBook'; 
const FONT_FILE = 'resources/ABCOracle-Book.otf'; 

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Ensure consistent sizing across high-DPI screens
  pixelDensity(1);
  noStroke();
  textureMode(NORMAL);
  textureWrap(CLAMP);
  
  let ctx = drawingContext;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  injectFontCSS();
  overlayPG = createGraphics(windowWidth, windowHeight);

  if (typeof CCapture === 'undefined') {
      loadScript("https://unpkg.com/ccapture.js@1.1.0/build/CCapture.all.min.js", () => {
          console.log("CCapture loaded dynamically.");
      });
  }

  uploadInput = createFileInput(handleFileUpload);
  uploadInput.attribute('multiple', 'true');
  styleUIElement(uploadInput);
  uploadInput.style('width', '180px');
  uploadInput.elt.onclick = function() { isResetting = true; };

  exportSelect = createSelect();
  updateExportOptions();
  styleUIElement(exportSelect);
  exportSelect.style('width', '140px');

  exportBtn = createButton('Save Image');
  styleUIElement(exportBtn);
  exportBtn.mousePressed(handleExport);
  
  recordBtn = createButton('Save Video');
  styleUIElement(recordBtn);
  recordBtn.mousePressed(handleVideoToggle);

  perspectiveSlider = createSlider(10, 150, 60, 1);
  perspectiveSlider.style('width', '80px');
  perspLabel = createDiv("Perspective");
  styleLabel(perspLabel);

  tickBtn = createButton('Motion: Smooth');
  styleUIElement(tickBtn);
  tickBtn.style('width', '110px');
  tickBtn.style('text-align', 'center');
  tickBtn.mousePressed(toggleTickMode);
  
  setupModeButtons();
  setupGadget();

  generatePlaceholders();
  positionUI(); // layoutGadget is called inside here now
  changeMode(4); 
}

function injectFontCSS() {
  let css = `
    @font-face { 
      font-family: '${FONT_NAME}'; 
      src: url('${FONT_FILE}') format('opentype');
      font-weight: normal;
      font-style: normal;
    }`;
  let styleElt = createElement('style', css);
  styleElt.parent(document.head);
}

function setupModeButtons() {
    let modesToCreate = [4]; 
    for (let m of modesToCreate) {
        let btn = createButton(String(m));
        btn.style('font-family', `'${FONT_NAME}', sans-serif`);
        btn.style('font-size', '14px');
        btn.style('font-weight', 'bold');
        btn.style('text-align', 'center');
        btn.style('border', '1px solid #ccc');
        btn.style('border-radius', '4px');
        btn.style('cursor', 'pointer');
        btn.style('width', '30px');
        btn.style('height', '30px');
        btn.style('padding', '0');
        btn.style('line-height', '28px');
        btn.mousePressed(() => changeMode(m));
        modeButtons.push({ btn: btn, modeID: m });
    }
}

function setupGadget() {
  pillInput = createInput('Feeeeeelings');
  
  // Basic structural styling, sizes will be set in layoutGadget
  pillInput.style('background', 'transparent');
  pillInput.style('border', '1px solid #ccc');
  pillInput.style('border-radius', '4px');
  pillInput.style('padding', '4px');
  pillInput.style('opacity', '0.7');
  pillInput.style('font-family', `'${FONT_NAME}', sans-serif`);
  pillInput.style('font-size', '12px');
  pillInput.style('color', '#555');
  
  pillInput.input(updatePillText); 
  
  gadgetContainer = createDiv('');
  gadgetContainer.style('display', 'flex');
  gadgetContainer.style('align-items', 'center');
  gadgetContainer.style('justify-content', 'center');
  gadgetContainer.style('position', 'absolute');
  gadgetContainer.style('z-index', '1000');
  
  pillDisplayText = createDiv('Feeeeeelings');
  // Base styling, dimensions handled dynamically
  styleGadgetBase(pillDisplayText);
  
  pillCounter = createDiv('0 elements');
  styleGadgetBase(pillCounter);
  
  pillDisplayText.parent(gadgetContainer);
  pillCounter.parent(gadgetContainer);
  
  updatePillText();
}

function updatePillText() {
    let text = pillInput.value();
    if(text.length === 0) text = '&nbsp;';
    pillDisplayText.html(text);
}

function styleGadgetBase(elt) {
  elt.style('background', 'rgba(235, 235, 235, 0.85)');
  elt.style('backdrop-filter', 'blur(100px)'); 
  elt.style('-webkit-backdrop-filter', 'blur(25px)');
  elt.style('border', '1px solid rgba(255, 255, 255, 0.2)'); 
  elt.style('font-family', `'${FONT_NAME}', sans-serif`); 
  elt.style('color', '#000');
  elt.style('outline', 'none');
  elt.style('text-align', 'center');
  elt.style('white-space', 'nowrap'); 
}

// --- NEW FUNCTION: Handles Responsive Sizing ---
function layoutGadget() {
  // Reference height: 1000px.
  // 1.5x Scale Values:
  // Font: 24px
  // Padding: ~17px 15px
  // Radius: 12px
  
  let h = windowHeight;
  let scaleFactor = h / 1000.0; 
  
  // Clamp scale so it doesn't get too tiny on phones or too huge on 4k
  scaleFactor = constrain(scaleFactor, 0.5, 1.5);

  let gFont = 24 * scaleFactor;
  let gPadY = 17 * scaleFactor;
  let gPadX = 15 * scaleFactor;
  let gRadius = 12 * scaleFactor;
  let gGap = 15 * scaleFactor;

  // Apply to container
  gadgetContainer.style('gap', `${gGap}px`);
  
  // Apply to elements
  let elements = [pillDisplayText, pillCounter];
  for(let elt of elements) {
    elt.style('font-size', `${gFont}px`);
    elt.style('padding', `${gPadY}px ${gPadX}px`);
    elt.style('border-radius', `${gRadius}px`);
  }
}

function loadScript(url, callback){
    var script = document.createElement("script");
    script.type = "text/javascript";
    if (script.readyState){
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" || script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {
        script.onload = function(){ callback(); };
    }
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

function generatePlaceholders() {
  for (let i = 0; i < totalImages; i++) {
    let pg = createGraphics(1024, 1024);
    pg.pixelDensity(1);
    pg.background(220 + random(-20, 20));
    pg.fill(100);
    pg.textFont(FONT_NAME); 
    pg.textAlign(CENTER, CENTER);
    pg.textSize(100);
    pg.text("Upload", pg.width/2, pg.height/2 - 60);
    pg.textSize(60);
    pg.text("Image " + (i + 1), pg.width/2, pg.height/2 + 60);
    let rawImg = pg.get();
    let dynamicRadius = min(rawImg.width, rawImg.height) * 0.02;
    let roundedImg = makeRounded(rawImg, dynamicRadius);
    roundedImg.isPlaceholder = true;
    roundedImg.original = rawImg;
    imgs[i] = roundedImg;
    pg.remove();
  }
}

function updateExportOptions() {
  exportSelect.html('');
  exportSelect.option('Current View (Window)', 'window');
  exportSelect.option('Square (1080x1080)', 'square');
  exportSelect.option('Portrait (1080x1920)', 'portrait');
  exportSelect.option('Landscape (1920x1080)', 'landscape');
  exportSelect.option('Print (2400x3000)', 'print');
}

function styleUIElement(elt) {
  elt.style('font-family', `'${FONT_NAME}', sans-serif`);
  elt.style('font-size', '12px');
  elt.style('color', '#555');
  elt.style('background', 'transparent');
  elt.style('border', '1px solid #ccc');
  elt.style('border-radius', '4px');
  elt.style('padding', '4px');
  elt.style('opacity', '0.7');
}

function styleLabel(elt) {
  elt.style('font-family', `'${FONT_NAME}', sans-serif`);
  elt.style('font-size', '10px');
  elt.style('color', '#333');
  elt.style('background', 'transparent');
  elt.style('pointer-events', 'none');
  elt.style('text-transform', 'uppercase');
  elt.style('letter-spacing', '1px');
}

function mouseWheel(event) {
  camDist += event.delta;
  camDist = constrain(camDist, 200, 10000);
  return false;
}

function toggleTickMode() {
    isTicking = !isTicking;
    if(isTicking) {
        tickBtn.html("Motion: Clock");
        tickBtn.style('background', '#eee');
    } else {
        tickBtn.html("Motion: Smooth");
        tickBtn.style('background', 'transparent');
    }
}

function handleVideoToggle() {
    if (isRecording) stopVideoExport();
    else startVideoExport();
}

function startVideoExport() {
    if (typeof CCapture === 'undefined') {
        alert("Video library loading... please wait 2 seconds and try again.");
        return;
    }
    let choice = exportSelect.value();
    let targetW = width, targetH = height;
    if (choice === 'square') { targetW = 1080; targetH = 1080; }
    else if (choice === 'portrait') { targetW = 1080; targetH = 1920; }
    else if (choice === 'landscape') { targetW = 1920; targetH = 1080; }
    else if (choice === 'print') { targetW = 2400; targetH = 3000; }

    resizeCanvas(targetW, targetH);
    exportRatio = targetH / windowHeight;
    aspectMultiplier = 1;
    if (choice !== 'window') {
        let currentAspect = windowWidth / windowHeight;
        let targetAspect = targetW / targetH;
        if (targetAspect < currentAspect) aspectMultiplier = currentAspect / targetAspect;
    }
    
    isVideoExport = true;
    recorder = new CCapture({ format: 'webm', framerate: 30 });
    recorder.start();
    isRecording = true;
    recordingStartFrame = frameCount;
    
    recordBtn.html("Stop");
    recordBtn.style('background', '#ffcccc');
    recordBtn.style('color', 'red');
}

function stopVideoExport() {
    if(recorder) {
        recorder.stop();
        recorder.save();
        isRecording = false;
        isVideoExport = false;
        recordBtn.html("Save Video");
        recordBtn.style('background', 'transparent');
        recordBtn.style('color', '#555');
        resizeCanvas(windowWidth, windowHeight);
        exportRatio = 1;
        aspectMultiplier = 1;
        positionUI();
        toggleUI(isUIVisible);
    }
}

function handleExport() {
  let choice = exportSelect.value();
  let targetW = width, targetH = height;

  if (choice === 'square') { targetW = 1080; targetH = 1080; }
  else if (choice === 'portrait') { targetW = 1080; targetH = 1920; }
  else if (choice === 'landscape') { targetW = 1920; targetH = 1080; }
  else if (choice === 'print') { targetW = 2400; targetH = 3000; }

  exportRatio = targetH / height;
  aspectMultiplier = 1;
  if (choice !== 'window') {
      let currentAspect = width / height;
      let targetAspect = targetW / targetH;
      if (targetAspect < currentAspect) aspectMultiplier = currentAspect / targetAspect;
  }

  isExporting = true;
  resizeCanvas(targetW, targetH);
  draw();
  save("cosmos_export_" + choice + ".png");
  resizeCanvas(windowWidth, windowHeight);
  isExporting = false;
  exportRatio = 1;
  aspectMultiplier = 1;
  positionUI();
  toggleUI(isUIVisible);
}

function handleFileUpload(file) {
  if (file.type === 'image') {
    loadImage(file.data, (loadedImg) => {
      autoShuffle = false;
      if (isResetting) {
        imgs = [];
        nodes = [];
        isResetting = false;
        uploadCounter = 0;
      }
      let dynamicRadius = min(loadedImg.width, loadedImg.height) * 0.02;
      let roundedImg = makeRounded(loadedImg, dynamicRadius);
      roundedImg.original = loadedImg;
      imgs.push(roundedImg);
      refreshNodesForCurrentMode();
      pillCounter.html(nodes.length + " elements");
      uploadCounter++;
    });
  }
}

function refreshNodesForCurrentMode() {
    rebuildMode4();
}

function makeRounded(img, radius) {
  let mask = createGraphics(img.width, img.height);
  mask.pixelDensity(1);
  mask.clear();
  mask.fill(255);
  mask.noStroke();
  mask.rect(0, 0, img.width, img.height, radius);
  let newImg = img.get();
  newImg.mask(mask);
  mask.remove();
  if(img.isPlaceholder) newImg.isPlaceholder = true;
  return newImg;
}

function mousePressed() {
  if (mouseY > height - 50) return;
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  isDragging = true;
}

function mouseReleased() {
  isDragging = false;
}

function handleCameraDrag() {
  if (!isDragging) return;
  let sensitivity = 0.005;
  camRotY += (mouseX - prevMouseX) * sensitivity;
  camRotX += (mouseY - prevMouseY) * sensitivity;
  
  camRotX = constrain(camRotX, -HALF_PI, HALF_PI); 
  camRotY = constrain(camRotY, -PI, PI);              
  
  prevMouseX = mouseX;
  prevMouseY = mouseY;
}

function draw() {
  background(255);
  drawLogoMode();
  
  if (isExporting || isRecording) drawGadgetOverlay();

  if (isRecording) {
      recorder.capture(document.querySelector('canvas'));
      if (frameCount - recordingStartFrame > recordingDuration) stopVideoExport();
  }
}

function drawGadgetOverlay() {
  if (overlayPG.width !== width || overlayPG.height !== height) {
      overlayPG = createGraphics(width, height);
  }
  overlayPG.clear();
  let ctx = overlayPG.drawingContext;
  
  // Dynamic scaling for export
  // Base 1.5x size at normal scale is 24px
  let scaledFontSize = 24 * exportRatio;
  overlayPG.textFont(FONT_NAME);
  ctx.font = `${scaledFontSize}px '${FONT_NAME}', sans-serif`; 
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  let txt = pillInput.value();
  if(txt.length === 0) txt = " ";
  let countTxt = nodes.length + " elements";
  let txtWidth = ctx.measureText(txt).width;
  let countWidth = ctx.measureText(countTxt).width;

  // 1.5x Scaled metrics
  let padX = 15 * exportRatio; 
  let padY = 17 * exportRatio; 
  let gap = 15 * exportRatio;
  let radius = 12 * exportRatio;
  
  let h = scaledFontSize + (padY * 2); 
  let w1 = txtWidth + (padX * 2);
  let w2 = countWidth + (padX * 2);
  let totalW = w1 + gap + w2;

  let startX = (width - totalW) / 2, centerY = height / 2;
  let topY = centerY - h/2; 
  
  let bgImg = get(startX, topY, totalW, h);
  bgImg.filter(BLUR, 10 * exportRatio); 
  
  // Draw Pill 1
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(startX, topY, w1, h, radius); 
  ctx.clip(); 
  ctx.drawImage(bgImg.canvas, 0, 0, w1, h, startX, topY, w1, h);
  ctx.fillStyle = "rgba(235, 235, 235, 0.85)"; 
  ctx.fill(); 
  ctx.lineWidth = 1 * exportRatio;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.stroke();
  ctx.restore(); 
  
  // Draw Pill 2
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(startX + w1 + gap, topY, w2, h, radius);
  ctx.clip(); 
  ctx.drawImage(bgImg.canvas, w1 + gap, 0, w2, h, startX + w1 + gap, topY, w2, h);
  ctx.fillStyle = "rgba(235, 235, 235, 0.85)";
  ctx.fill();
  ctx.lineWidth = 1 * exportRatio;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.stroke();
  ctx.restore();
  
  ctx.fillStyle = "#000000";
  ctx.fillText(txt, startX + w1/2, centerY);
  ctx.fillText(countTxt, startX + w1 + gap + w2/2, centerY);
  
  push();
  resetMatrix();
  camera(0, 0, (height/2.0) / tan(PI*30.0 / 180.0), 0, 0, 0, 0, 1, 0);
  ortho(-width/2, width/2, -height/2, height/2);
  noLights();
  imageMode(CORNER); 
  image(overlayPG, -width/2, -height/2);
  pop();
}

function keyPressed() {
  if (key === '4') changeMode(4);
}

function toggleUI(visible) {
    let displayVal = visible ? 'block' : 'none';
    uploadInput.style('display', displayVal);
    exportSelect.style('display', displayVal);
    exportBtn.style('display', displayVal);
    recordBtn.style('display', displayVal);
    
    for(let obj of modeButtons) obj.btn.style('display', displayVal);

    if (visible) {
        gadgetContainer.style('display', 'flex');
        pillInput.style('display', 'block');
        pillCounter.html(nodes.length + " elements");
        updatePillText();
        perspectiveSlider.show(); perspLabel.show();
        tickBtn.show();
    } else {
        gadgetContainer.style('display', 'none');
        pillInput.style('display', 'none');
        perspectiveSlider.hide(); perspLabel.hide();
        tickBtn.hide();
    }
}

function rebuildMode4() {
  nodes = [];
  if (imgs.length === 0) return;
  let targetCount = imgs.length;
  let baseRadius = 420;
  for (let i = 0; i < targetCount; i++) {
     let angle = (TWO_PI / targetCount) * i;
     addNode(imgs[i], angle, baseRadius, 280, 0, 0, 0, 'flat', 0);
  }
}

function updateModeButtonStyle() {
    for (let obj of modeButtons) {
        if (obj.modeID === mode) {
            obj.btn.style('background-color', '#333');
            obj.btn.style('color', '#fff');
            obj.btn.style('border', '1px solid #333');
        } else {
            obj.btn.style('background-color', 'rgba(255,255,255,0.8)');
            obj.btn.style('color', '#555');
            obj.btn.style('border', '1px solid #ccc');
        }
    }
}

function changeMode(newMode) {
  mode = newMode;
  nodes = [];
  frameCount = 0;
  camRotX = 0;
  camRotY = 0;

  let minDim = min(width, height);
  camDist = (height / minDim) * 1600; 
  
  updateModeButtonStyle();
  updateExportOptions();
  positionUI();
  refreshNodesForCurrentMode();
  toggleUI(isUIVisible);
}

function addNode(img, angle, radius, maxSize, xOff, yOff, zOff, curveType, layerIndex) {
  if (!img) return;
  let ratio = img.width / img.height;
  let w = maxSize, h = maxSize;
  if (ratio >= 1) h = w / ratio;
  else w = h * ratio;
  nodes.push({ img, angle, radius, w, h, targetScale: 1, xOff, yOff, zOff, curveType, layerIndex, aspect: ratio });
}

function getTransformedDistance(x, y, z, rotX, rotY, cameraZ) {
    let y1 = y * cos(rotX) - z * sin(rotX);
    let z1 = y * sin(rotX) + z * cos(rotX);
    let x2 = x * cos(rotY) + z1 * sin(rotY);
    let z2 = -x * sin(rotY) + z1 * cos(rotY);
    return dist(x2, y1, z2, 0, 0, cameraZ);
}

function drawDynamicRoundedPlane(img, w, h, distance, cameraDist) {
    let closestPossible = cameraDist - 1200, furthestPossible = cameraDist + 1200;
    let roundnessFactor = map(distance, closestPossible, furthestPossible, 0.02, 0.11, true);
    let effectiveRadius = min(w, h) * roundnessFactor;
    texture(img);
    beginShape();
    let steps = 6, hw = w / 2, hh = h / 2, r = effectiveRadius;
    let u = (x) => map(x, -hw, hw, 0, 1), v = (y) => map(y, -hh, hh, 0, 1);
    for (let i = 0; i <= steps; i++) {
        let theta = map(i, 0, steps, 0, HALF_PI);
        let px = hw - r + r * cos(theta), py = hh - r + r * sin(theta);
        vertex(px, py, 0, u(px), v(py));
    }
    for (let i = 0; i <= steps; i++) {
        let theta = map(i, 0, steps, HALF_PI, PI);
        let px = -hw + r + r * cos(theta), py = hh - r + r * sin(theta);
        vertex(px, py, 0, u(px), v(py));
    }
    for (let i = 0; i <= steps; i++) {
        let theta = map(i, 0, steps, PI, PI + HALF_PI);
        let px = -hw + r + r * cos(theta), py = -hh + r + r * sin(theta);
        vertex(px, py, 0, u(px), v(py));
    }
    for (let i = 0; i <= steps; i++) {
        let theta = map(i, 0, steps, PI + HALF_PI, TWO_PI);
        let px = hw - r + r * cos(theta), py = -hh + r + r * sin(theta);
        vertex(px, py, 0, u(px), v(py));
    }
    endShape(CLOSE);
}

function drawLogoMode() {
  let fovVal = perspectiveSlider.value();
  let fov = radians(fovVal);
  perspective(fov, width / height, 0.1, 50000);
  let scaleFactor = tan(PI / 6.0) / tan(fov / 2.0);
  let useScale = (isExporting || isVideoExport) ? exportRatio : 1;
  let finalDist = camDist * useScale * scaleFactor;
  camera(0, 0, finalDist, 0, 0, 0, 0, 1, 0);
  if (!isExporting && !isRecording) handleCameraDrag();
  rotateX(camRotX); rotateY(camRotY);
  if (isExporting || isVideoExport) scale(exportRatio);

  let rotationOffset = 0;
  if (!isTicking) rotationOffset = frameCount * 0.03;
  else {
      let stepSize = TWO_PI / nodes.length, period = 60;
      let tickIndex = floor(frameCount / period);
      // Normalized time 0 -> 1
      let rawT = constrain((frameCount % period) / (period * 0.5), 0, 1);
      // Custom Bezier Easing: 0.5, 0.1, 0.1, 0.9
      let easedT = cubicBezier(rawT, 0.5, 0.1, 0.1, 0.9);
      rotationOffset = (tickIndex + easedT) * stepSize;
  }

  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    push();
    let expansion = isTicking ? 0 : sin(frameCount * 0.04 + i * 0.1) * 200;
    let zOffset = isTicking ? 0 : cos(frameCount * 0.05 + i * 0.2) * 150;
    let currentRadius = n.radius + 300 + expansion;
    let orbitalAngle = n.angle + rotationOffset;
    let x = currentRadius * cos(orbitalAngle), y = currentRadius * sin(orbitalAngle), z = zOffset;
    let realDistance = getTransformedDistance(x, y, z, camRotX, camRotY, finalDist);
    translate(x, y, z);
    rotateY(-camRotY); rotateX(-camRotX);
    let sizeWave = isTicking ? 1 : map(sin(frameCount * 0.05 + i * 0.5), -1, 1, 0.6, 1.4);
    n.targetScale = lerp(n.targetScale, 1, 0.2); scale(n.targetScale * sizeWave);
    let imgToDraw = n.img.original ? n.img.original : n.img;
    drawDynamicRoundedPlane(imgToDraw, n.w, n.h, realDistance, finalDist);
    pop();
  }
}

function positionUI() {
  uploadInput.position(20, height - 40);
  exportSelect.position(220, height - 40);
  exportBtn.position(370, height - 40);
  recordBtn.position(460, height - 40);
  let slot3X = 550;
  perspectiveSlider.position(slot3X, height - 40);
  perspLabel.position(slot3X, height - 55);
  tickBtn.position(slot3X + 90, height - 40);
  pillInput.position(slot3X + 210, height - 40);
  let startX = width - 40, btnSize = 30, gap = 10;
  for (let i = modeButtons.length - 1; i >= 0; i--) {
      let pos = startX - ((modeButtons.length - 1 - i) * (btnSize + gap)) - btnSize;
      modeButtons[i].btn.position(pos, 20);
  }
  
  // Center gadget
  gadgetContainer.style('left', '50%'); 
  gadgetContainer.style('top', '50%');
  gadgetContainer.style('transform', 'translate(-50%, -50%)');
  
  // Recalculate sizes based on new window dimensions
  layoutGadget();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let minDim = min(width, height);
  camDist = (height / minDim) * 1600; 
  positionUI();
  toggleUI(isUIVisible);
}

// --- HELPER: CUBIC BEZIER SOLVER ---
function cubicBezier(t, x1, y1, x2, y2) {
  // Solves for cubic bezier curve (CSS-like)
  // x1, y1, x2, y2 are control points 1 and 2 (0,0 and 1,1 are implicit)
  
  // Calculate coefficients for X and Y
  let cx = 3 * x1;
  let bx = 3 * (x2 - x1) - cx;
  let ax = 1 - cx - bx;
  
  let cy = 3 * y1;
  let by = 3 * (y2 - y1) - cy;
  let ay = 1 - cy - by;

  function sampleCurveX(tVal) { return ((ax * tVal + bx) * tVal + cx) * tVal; }
  function sampleCurveY(tVal) { return ((ay * tVal + by) * tVal + cy) * tVal; }
  function sampleCurveDerivativeX(tVal) { return (3 * ax * tVal + 2 * bx) * tVal + cx; }

  // Given an x (time), solve for t using Newton-Raphson
  function solveCurveX(x) {
    let t0, t1, t2, x2, d2, i;
    for (t2 = x, i = 0; i < 8; i++) {
      x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 1e-6) return t2;
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }
    // Fallback to bisection
    t0 = 0.0; t1 = 1.0; t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < 1e-6) return t2;
      if (x2 > x) t1 = t2;
      else t0 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  }
  return sampleCurveY(solveCurveX(t));
}
