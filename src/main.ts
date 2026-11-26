const I18N={"en":{"shader":"Shader","params":"Parameters","hue":"Hue shift","speed":"Speed","pause":"Pause","pauseb":"⏸ pause","glsl":"GLSL source","hint":"move mouse over the canvas"},"de":{"shader":"Shader","params":"Parameter","hue":"Farbton","speed":"Tempo","pause":"Pause","pauseb":"⏸ pause","glsl":"GLSL-Quelltext","hint":"maus über die canvas bewegen"}};
let lang=localStorage.getItem('lang')||'en';
const t=k=>I18N[lang][k]||k;
function applyLang(){document.documentElement.lang=lang;document.querySelectorAll('[data-i]').forEach(el=>el.textContent=t(el.dataset.i));document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));}
document.querySelectorAll('.lang button').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;localStorage.setItem('lang',lang);applyLang();});

const PRESETS=[{"name":"plasma","code":"precision highp float;uniform vec2 uRes;uniform float uTime,uHue,uSpeed;uniform vec2 uMouse;\nvec3 hsv2rgb(vec3 c){vec3 rgb=clamp(abs(mod(c.x*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);return c.z*mix(vec3(1.),rgb,c.y);}\nvoid main(){vec2 uv=gl_FragCoord.xy/uRes;float t=uTime*uSpeed;\nfloat v=sin(uv.x*8.+t)+sin(uv.y*7.-t*1.3)+sin((uv.x+uv.y)*5.+t*.7)+sin(length(uv-.5)*20.-t);\nvec3 c=hsv2rgb(vec3(fract(v*.25+uHue),.85,.9));gl_FragColor=vec4(c,1.);}"},{"name":"voronoi","code":"precision highp float;uniform vec2 uRes;uniform float uTime,uHue,uSpeed;uniform vec2 uMouse;\nvec3 hsv(float h){return .5+.5*cos(6.2831*(h+vec3(0.,.33,.67)));}\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nvoid main(){vec2 uv=gl_FragCoord.xy/uRes*vec2(uRes.x/uRes.y,1.)*4.;float t=uTime*uSpeed;\nvec2 g=floor(uv),f=fract(uv);float md=8.;vec2 mp;\nfor(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y);vec2 r=vec2(hash(g+o),hash(g+o+7.))+.5+sin(t*.3+g)*.15;float d=length(o+r-f);if(d<md){md=d;mp=r;}}\nfloat edge=smoothstep(.02,0.,md-.01);vec3 c=mix(vec3(.9,.2,.5),vec3(.1,.8,.9),edge);gl_FragColor=vec4(c*hsv(uHue),1.);}"},{"name":"mandelbrot","code":"precision highp float;uniform vec2 uRes;uniform float uTime,uHue,uSpeed;uniform vec2 uMouse;\nvoid main(){vec2 c=(gl_FragCoord.xy/uRes-.5)*vec2(uRes.x/uRes.y,1.)*3.;c+=vec2(uMouse.x,uMouse.y)*.5;c*=pow(1.001,uTime*uSpeed);\nvec2 z=vec2(0.);float i=0.;for(int n=0;n<200;n++){z=vec2(z.x*z.x-z.y*z.y+c.x,2.*z.x*z.y+c.y);if(dot(z,z)>4.)break;i++;}\nfloat f=i/200.;vec3 col=.5+.5*cos(6.2831*(f*3.+uHue+vec3(0.,.33,.67)));gl_FragColor=vec4(col*(smoothstep(0.,.1,f)),1.);}"},{"name":"aurora","code":"precision highp float;uniform vec2 uRes;uniform float uTime,uHue,uSpeed;uniform vec2 uMouse;\nvoid main(){vec2 uv=gl_FragCoord.xy/uRes;float t=uTime*uSpeed;\nfloat n=sin(uv.x*6.+t)*.5+sin(uv.y*9.-t*.7)*.3+sin((uv.x+uv.y)*4.+t*.4)*.2;\nfloat band=smoothstep(.2,.9,n+sin(uv.x*20.+t*2.)*.1);\nvec3 c=vec3(.02,.03,.08)+vec3(.1,.5,.9)*band*.8+vec3(.6,.2,.9)*pow(band,3.)*.5;\ngl_FragColor=vec4(c,1.);}"},{"name":"fluid","code":"precision highp float;uniform vec2 uRes;uniform float uTime,uHue,uSpeed;uniform vec2 uMouse;\nvoid main(){vec2 uv=gl_FragCoord.xy/uRes-.5;uv.x*=uRes.x/uRes.y;float t=uTime*uSpeed;\nvec2 m=uMouse-.5;m.x*=uRes.x/uRes.y;\nfloat d=length(uv-m*2.);\nfloat v=sin(d*12.-t*2.)*.5+.5;v*=smoothstep(.8,.1,d);\nfloat w=sin(uv.y*14.+t+sin(uv.x*8.))*smoothstep(.6,.0,abs(uv.y));\nvec3 c=vec3(.03,.02,.06)+vec3(.9,.3,.7)*v+vec3(.2,.8,1.)*w;\ngl_FragColor=vec4(c,1.);}"}];
const VERT="attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const cv=document.getElementById('cv'),gl=cv.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
const $=id=>document.getElementById(id);
let W,H,prog=null,buf=null,start=performance.now(),paused=false,cur=0,mx=0,my=0;
function resize(){const r=cv.parentElement.getBoundingClientRect();W=cv.width=r.width*devicePixelRatio;H=cv.height=r.height*devicePixelRatio;gl.viewport(0,0,W,H);}
addEventListener('resize',resize);resize();
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function build(i){
  if(prog){gl.deleteProgram(prog);}
  prog=gl.createProgram();
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,VERT));
  gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,PRESETS[i].code));
  gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  if(!buf){buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);}
  const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  window._u={};for(const n of ['uRes','uTime','uHue','uSpeed','uMouse'])window._u[n]=gl.getUniformLocation(prog,n);
  $('glsl').textContent=PRESETS[i].code;
}
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5;});
cv.addEventListener('touchmove',e=>{const r=cv.getBoundingClientRect();const t=e.touches[0];mx=(t.clientX-r.left)/r.width-.5;my=(t.clientY-r.top)/r.height-.5;},{passive:true});
function frame(){
  gl.uniform2f(window._u.uRes,W,H);
  gl.uniform1f(window._u.uTime,(performance.now()-start)/1000);
  gl.uniform1f(window._u.uHue,+$('hue').value);
  gl.uniform1f(window._u.uSpeed,+$('speed').value);
  gl.uniform2f(window._u.uMouse,mx,my);
  gl.drawArrays(gl.TRIANGLES,0,3);
  if(!paused)requestAnimationFrame(frame);
}
$('hue').oninput=()=>$('hue')&&frame&&0;
$('speed').oninput=()=>{};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'⏸';if(!paused)requestAnimationFrame(frame);};
const pw=$('presets');
PRESETS.forEach((p,i)=>{const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>{cur=i;build(i);start=performance.now();if(paused){paused=false;$('pause').textContent='⏸';}requestAnimationFrame(frame);};pw.appendChild(b);});
build(0);requestAnimationFrame(frame);applyLang();