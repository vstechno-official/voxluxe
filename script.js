const micBtn=document.getElementById('micBtn')
const canvas=document.getElementById('visualizer')
const ctx=canvas.getContext('2d')
let audioCtx=null
let analyser=null
let sourceNode=null
let gainNode=null
let mediaStream=null
let animationId=null
const BAR_COUNT=7
const BAR_WIDTH=30
const BAR_GAP=12
const RADIUS=8
function drawRoundedBar(x,y,w,h,r,style){
  ctx.fillStyle=style
  ctx.beginPath()
  ctx.moveTo(x+r,y)
  ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y)
  ctx.closePath()
  ctx.fill()
}
function renderVisualizer(){
  const width=canvas.width
  const total=BAR_COUNT*BAR_WIDTH+(BAR_COUNT-1)*BAR_GAP
  const startX=(width-total)/2
  const freq=new Uint8Array(analyser.frequencyBinCount)
  // Determine visualizer style
  const style = visualizerStyleSelect ? visualizerStyleSelect.value : 'bars';
  analyser.getByteFrequencyData(freq)
  ctx.clearRect(0,0,width,canvas.height)
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim()
  if (style === 'wave') {
    // Draw wave using frequency data (simple line)
    ctx.beginPath()
    ctx.moveTo(0, canvas.height/2)
    const sliceWidth = width * 1.0 / analyser.frequencyBinCount
    let x = 0
    for(let i=0; i<analyser.frequencyBinCount; i++){
      const v = freq[i] / 128.0 // 0..255 to -1..1 approx
      const y = v * canvas.height/2
      if(i===0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(width, canvas.height/2)
    ctx.strokeStyle = accent
    ctx.stroke()
  } else {
    // Default bars
    for(let i=0;i<BAR_COUNT;i++){
      const bin=i*2
      const mag=freq[bin]||0
      const h=(mag/255)*canvas.height
      const x=startX+i*(BAR_WIDTH+BAR_GAP)
      const y=canvas.height-h
      const grad=ctx.createLinearGradient(0,canvas.height,0,y)
      grad.addColorStop(0,accent)
      grad.addColorStop(0.8,accent+'33')
      grad.addColorStop(1,'transparent')
      drawRoundedBar(x,y,BAR_WIDTH,h,RADIUS,grad)
    }
  }
  animationId=requestAnimationFrame(renderVisualizer)
}
async function startMic(){
  try{
    mediaStream=await navigator.mediaDevices.getUserMedia({audio:true})
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'})
    else if(audioCtx.state==='suspended')await audioCtx.resume()
    sourceNode=audioCtx.createMediaStreamSource(mediaStream)
    analyser=audioCtx.createAnalyser()
    analyser.fftSize=256
    gainNode=audioCtx.createGain()
    gainNode.gain.value=parseFloat(gainSlider.value)
    sourceNode.connect(gainNode)
    gainNode.connect(analyser)
    if (passthroughToggle.checked) {
      gainNode.connect(audioCtx.destination)
    }
    renderVisualizer()
    micBtn.classList.add('active')
    micBtn.setAttribute('aria-pressed','true')
  }catch(e){
    console.error(e)
  }
}
function stopMic(){
  if(mediaStream){
    mediaStream.getTracks().forEach(t=>t.stop())
    mediaStream=null
  }
  if(sourceNode)sourceNode.disconnect()
  if(analyser)analyser.disconnect()
  if(gainNode)gainNode.disconnect()
  if(animationId)cancelAnimationFrame(animationId)
  micBtn.classList.remove('active')
  micBtn.setAttribute('aria-pressed','false')
}
async function toggleMic(){
  if(micBtn.classList.contains('active'))stopMic()
  else await startMic()
}
micBtn.addEventListener('click',toggleMic)
micBtn.addEventListener('keydown',e=>{
  if(e.key===' '||e.key==='Enter'){
    e.preventDefault()
    toggleMic()
  }
})

/* ---- Settings modal logic ---- */
const settingsBtn=document.getElementById('settingsBtn')
const modal=document.getElementById('settingsModal')
const closeBtn=modal.querySelector('.close-btn')
settingsBtn.addEventListener('click',()=>modal.classList.add('open'))
closeBtn.addEventListener('click',()=>modal.classList.remove('open'))
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')})

/* ---- Settings handling ---- */
const gainSlider = document.getElementById('gainSlider');
const gainValue = document.getElementById('gainValue');
const passthroughToggle = document.getElementById('passthroughToggle');
const visualizerStyleSelect = document.getElementById('visualizerStyle');

// Update gain display
gainSlider.addEventListener('input', () => {
  gainValue.textContent = parseFloat(gainSlider.value).toFixed(1);
  if (gainNode) {
    gainNode.gain.value = parseFloat(gainSlider.value);
  }
});

// Passthrough toggle
let isPassthroughConnected = passthroughToggle.checked;
passthroughToggle.addEventListener('change', () => {
  if (passthroughToggle.checked) {
    if (gainNode && !isPassthroughConnected) {
      gainNode.connect(audioCtx.destination);
      isPassthroughConnected = true;
    }
  } else {
    if (gainNode && isPassthroughConnected) {
      gainNode.disconnect(audioCtx.destination);
      isPassthroughConnected = false;
    }
  }
});

// Visualizer style change (placeholder)
visualizerStyleSelect.addEventListener('change', () => {
  // For now, just log; could modify renderVisualizer later
  console.log('Visualizer style changed to:', visualizerStyleSelect.value);
});

// Initialize gain display
gainValue.textContent = parseFloat(gainSlider.value).toFixed(1);