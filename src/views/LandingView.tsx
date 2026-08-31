import { useCallback, useEffect, useRef, useState } from 'react';
import './LandingView.css';

const VERIFACTU_STEPS = [
  { when: 'Hoy', what: 'Sales del Excel y tus facturas quedan registradas en orden.' },
  { when: 'Antes de la obligación', what: 'Llega la integración VeriFactu dentro de Solvy.' },
  { when: 'Julio 2027', what: 'VeriFactu pasa a ser obligatorio para autónomos.' },
];

const FREE_FEATURES = [
  'Registro de ingresos y gastos',
  'Dashboard en tiempo real',
  'Estimación de impuestos',
];

const PRO_FEATURES = [
  'Facturas ilimitadas',
  'Modelo 303 y Modelo 130',
  'Avisos antes de cada plazo',
  'OCR de tickets',
  'Libro registro y backup PDF',
];

interface LandingViewProps {
  onSignup: () => void;
  onLogin: () => void;
}

export default function LandingView({ onSignup, onLogin }: LandingViewProps) {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  // Il file /landing/demo.mp4 arriva a parte: finché non c'è, il player mostra il placeholder.
  const [demoUnavailable, setDemoUnavailable] = useState(false);
  const [founderPhotoMissing, setFounderPhotoMissing] = useState(false);
  const demoVideoRef = useRef<HTMLVideoElement>(null);

  const closeDemo = useCallback(() => {
    setIsDemoOpen(false);
    demoVideoRef.current?.pause();
  }, []);

  useEffect(() => {
    if (!isDemoOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDemo(); };
    document.addEventListener('keydown', onKey);
    const play = demoVideoRef.current?.play();
    if (play) play.catch(() => {});
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isDemoOpen, closeDemo]);

  const shaderHeroRef     = useRef<HTMLCanvasElement>(null);
  const shaderAppRef      = useRef<HTMLCanvasElement>(null);
  const shaderProblemRef  = useRef<HTMLCanvasElement>(null);
  const shaderFeaturesRef = useRef<HTMLCanvasElement>(null);
  const shaderPricingRef  = useRef<HTMLCanvasElement>(null);
  const shaderFooterRef   = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    // ── WebGL shader factory ──
    function initShader(canvas: HTMLCanvasElement | null, timeOffset: number) {
      if (!canvas) return;
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!gl) return;

      const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
      const frag = `precision highp float;uniform vec2 r;uniform float t;
        float w(vec2 uv,float fr,float sp,float a,float ph){return a*sin(uv.x*fr+t*sp+ph);}
        void main(){
          vec2 uv=gl_FragCoord.xy/r;uv.x*=r.x/r.y;
          vec3 c=vec3(0.035,0.015,0.09);
          float b[8];b[0]=0.2;b[1]=0.3;b[2]=0.4;b[3]=0.5;b[4]=0.6;b[5]=0.7;b[6]=0.75;b[7]=0.8;
          float f0=w(uv,3.2,0.5,0.08,0.0);float f1=w(uv,2.6,0.4,0.10,1.2);
          float f2=w(uv,4.0,0.7,0.06,2.5);float f3=w(uv,2.9,0.45,0.09,3.8);
          float f4=w(uv,3.6,0.6,0.07,5.0);float f5=w(uv,2.3,0.38,0.08,0.6);
          float f6=w(uv,4.4,0.8,0.05,1.8);float f7=w(uv,3.1,0.55,0.07,4.2);
          float fs[8];fs[0]=f0;fs[1]=f1;fs[2]=f2;fs[3]=f3;fs[4]=f4;fs[5]=f5;fs[6]=f6;fs[7]=f7;
          for(int i=0;i<8;i++){
            float y=b[i]+fs[i];float d=abs(uv.y-y);
            float ww=0.0015+float(i)*0.0001;float g=ww/(d*d+ww);
            float tt=float(i)/7.0;
            vec3 lc=mix(vec3(0.6,0.25,1.0),vec3(0.05,0.75,0.85),tt);
            c+=lc*g*0.55;
          }
          vec2 vg=uv-vec2(r.x/r.y*0.5,0.5);c*=1.0-dot(vg,vg)*0.35;
          gl_FragColor=vec4(c,1.0);
        }`;

      function mkShader(type: number, src: string) {
        const s = gl!.createShader(type)!;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        return s;
      }
      const prog = gl.createProgram()!;
      gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vert));
      gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const ur = gl.getUniformLocation(prog, 'r');
      const ut = gl.getUniformLocation(prog, 't');

      // `canvas` è narrowed a non-null qui sopra, ma TypeScript in strict
      // mode non propaga il narrowing di un parametro dentro closure
      // annidate (resize/frame) — si cattura in una costante locale, che
      // resta narrowed per sempre. Nessun cambio di comportamento.
      const canvasEl = canvas;

      function resize() {
        const p = canvasEl.parentElement!;
        canvasEl.width  = p.offsetWidth  * devicePixelRatio;
        canvasEl.height = p.offsetHeight * devicePixelRatio;
        canvasEl.style.width  = p.offsetWidth  + 'px';
        canvasEl.style.height = p.offsetHeight + 'px';
        gl!.viewport(0, 0, canvasEl.width, canvasEl.height);
      }
      resize();
      window.addEventListener('resize', resize);

      let rafId: number;
      let t0: number | null = null;
      const off = timeOffset;
      function frame(ts: number) {
        if (!t0) t0 = ts;
        const t = (ts - t0) * 0.001 + off;
        gl!.uniform2f(ur!, canvasEl.width, canvasEl.height);
        gl!.uniform1f(ut!, t);
        gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);

      cleanups.push(() => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
      });
    }

    initShader(shaderHeroRef.current,     0);
    initShader(shaderProblemRef.current,  4);
    initShader(shaderFeaturesRef.current, 8);
    initShader(shaderPricingRef.current,  16);
    initShader(shaderAppRef.current,      22);
    initShader(shaderFooterRef.current,   30);

    // ── Scroll animations ──
    const scrollObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('v');
        scrollObs.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('#landing-root .sa, #landing-root .sa2, #landing-root .sa3, #landing-root .sal, #landing-root .sar')
      .forEach(el => scrollObs.observe(el));
    cleanups.push(() => scrollObs.disconnect());

    // ── Parallax phones ──
    const appSection = document.querySelector('#landing-root .section-app') as HTMLElement | null;
    const phone1 = document.querySelector('#landing-root .app-screen-1') as HTMLElement | null;
    const phone2 = document.querySelector('#landing-root .app-screen-2') as HTMLElement | null;

    if (appSection && phone1 && phone2) {
      let active = false;

      const onEnter = () => {
        active = true;
        phone1.classList.add('parallax-active');
        phone2.classList.add('parallax-active');
        phone1.classList.remove('returning');
        phone2.classList.remove('returning');
      };
      const onMove = (e: MouseEvent) => {
        if (!active) return;
        const r  = appSection.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width  / 2) / r.width;
        const dy = (e.clientY - r.top  - r.height / 2) / r.height;
        phone1.style.transform = `perspective(1000px) rotateY(${8+dx*8}deg) rotateX(${-dy*5}deg) translateX(${20+dx*24}px) translateY(${dy*14}px)`;
        phone2.style.transform = `perspective(1000px) rotateY(${-4+dx*14}deg) rotateX(${-dy*8}deg) translateX(${-20+dx*40}px) translateY(${-20+dy*22}px)`;
      };
      const onLeave = () => {
        active = false;
        phone1.classList.add('returning');
        phone2.classList.add('returning');
        phone1.style.transform = 'perspective(1000px) rotateY(8deg) translateX(20px)';
        phone2.style.transform = 'perspective(1000px) rotateY(-4deg) translateX(-20px) translateY(-20px)';
        setTimeout(() => {
          phone1.classList.remove('parallax-active', 'returning');
          phone2.classList.remove('parallax-active', 'returning');
        }, 650);
      };

      appSection.addEventListener('mouseenter', onEnter);
      appSection.addEventListener('mousemove', onMove as EventListener);
      appSection.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        appSection.removeEventListener('mouseenter', onEnter);
        appSection.removeEventListener('mousemove', onMove as EventListener);
        appSection.removeEventListener('mouseleave', onLeave);
      });
    }

    return () => cleanups.forEach(fn => fn());
  }, []);

  return (
    <div id="landing-root">

      {/* ══ HERO ══ */}
      <section className="hero">
        <canvas id="shader-hero" ref={shaderHeroRef}></canvas>
        <div className="holo holo-1"></div>
        <div className="holo holo-2"></div>
        <div className="holo holo-3"></div>

        <nav className="nav">
          <div className="nav-logo">
            <img src="/landing/solvy-icon-1024.png" alt="Solvy" />
            <span>SOLVY</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={onLogin} className="nav-pill" style={{cursor:'pointer',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)'}}>Accedi</button>
            <span className="nav-pill">Para autónomos · España</span>
          </div>
        </nav>

        <div className="hero-body">
          <div className="hero-text">
            <div className="hero-tag sa"><span className="dot"></span>Tu gestoría fiscal en el bolsillo</div>
            <h1 className="hero-h1 sa2">
              Controla lo que<br />le debes a<br />
              <span className="g">Hacienda.</span>
            </h1>
            <p className="hero-sub sa3">
              Solvy calcula tu IVA e IRPF en tiempo real, con cada factura que emites. Sin sorpresas en julio. Sin sustos.
            </p>
            <div className="hero-cta sa3">
              <button onClick={onSignup} className="btn-primary">Empieza gratis</button>
              <button type="button" className="btn-ghost" onClick={() => setIsDemoOpen(true)}>Ver cómo funciona →</button>
            </div>
            <p className="hero-note sa3">Sin tarjeta · Gratis para siempre</p>
          </div>

          <div className="hero-visual sar">
            <div className="phone-wrap">
              <div className="float-card fc-1">
                <div className="fc-label">IRPF este trimestre</div>
                <div className="fc-value">€2.384</div>
                <div className="fc-sub">Calculado al instante</div>
              </div>
              <div className="float-card fc-2">
                <div className="fc-label">IVA a apartar</div>
                <div className="fc-value">€1.071</div>
                <div className="fc-sub">21% de €5.100</div>
              </div>
              <div className="fc-badge">✓ Sin sorpresas</div>
              <div className="phone">
                <div className="phone-inner">
                  <img src="/landing/IMG_9010.PNG" alt="Solvy Dashboard" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TRUST BAR ══ */}
      <div className="trust-bar sa">
        <div className="trust-inner">
          {[
            'Modelo 303 en 30 segundos',
            'IRPF en tiempo real',
            'Calendario fiscal con alertas',
            'Plan gratis para siempre',
          ].map(label => (
            <div className="trust-item" key={label}>
              <svg width="16" height="16" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ══ PROBLEMA ══ */}
      <section className="section-problem">
        <canvas id="shader-problem" ref={shaderProblemRef}></canvas>
        <div className="container" style={{position:'relative',zIndex:1}}>
          <div className="sa">
            <div className="eyebrow">El problema</div>
            <h2 className="section-h">Ser autónomo<br />es complicado.</h2>
          </div>
          <div className="prob-list">
            <div className="prob-row sal">
              <div className="prob-num">01</div>
              <div className="prob-content">
                <div className="prob-head">No sabes cuánto apartar cada mes</div>
                <div className="prob-body">El IVA que cobras no es tuyo. Llega julio y la factura de Hacienda te sorprende. Sin visibilidad, cada trimestre es una ruleta.</div>
              </div>
              <span className="prob-tag">Sin control</span>
            </div>
            <div className="prob-row sa">
              <div className="prob-num">02</div>
              <div className="prob-content">
                <div className="prob-head">Los plazos fiscales se te escapan</div>
                <div className="prob-body">Modelo 303, 130, RETA, declaración anual. Cuatro trimestres con fechas críticas que no puedes olvidar.</div>
              </div>
              <span className="prob-tag">Sin alertas</span>
            </div>
            <div className="prob-row sar">
              <div className="prob-num">03</div>
              <div className="prob-content">
                <div className="prob-head">Te enteras tarde de lo que debes</div>
                <div className="prob-body">La información fiscal llega cuando ya es el día 20. Sin visibilidad diaria, no puedes planificar ni apartar lo justo.</div>
              </div>
              <span className="prob-tag">Sin visibilidad</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ APP SHOWCASE ══ */}
      <section className="section-app" id="app">
        <canvas id="shader-app" ref={shaderAppRef}></canvas>
        <div className="holo-bg"></div>
        <div className="app-inner">
          <div className="app-screens sal">
            <div className="app-screen app-screen-1">
              <img src="/landing/IMG_9010.PNG" alt="Solvy Panel" style={{width:'190px'}} />
            </div>
            <div className="app-screen app-screen-2">
              <img src="/landing/IMG_9011.PNG" alt="Solvy Gráfico" style={{width:'190px'}} />
            </div>
          </div>
          <div className="app-text sar">
            <div className="eyebrow">Así funciona Solvy</div>
            <h2 className="section-h">Tu dashboard<br />fiscal, siempre<br />actualizado.</h2>
            <p className="app-sub">Con cada factura que emites, Solvy recalcula automáticamente tu IVA acumulado, tu IRPF estimado y tu resultado operativo real.</p>
            <ul className="feature-list">
              {[
                'IRPF e IVA actualizados al instante',
                'Tendencia mensual de ingresos y gastos',
                'Resultado operativo en tiempo real',
                'Alertas antes de cada plazo fiscal',
              ].map(item => (
                <li key={item}><span className="check">✓</span> {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="section-features">
        <canvas id="shader-features" ref={shaderFeaturesRef}></canvas>
        <div className="container" style={{position:'relative',zIndex:1}}>
          <div className="sa" style={{textAlign:'center'}}>
            <div className="eyebrow">Funcionalidades</div>
            <h2 className="section-h" style={{marginBottom:0}}>Todo lo que necesitas.<br />Nada más.</h2>
          </div>
          <div className="feat-3">
            <div className="fc sal">
              <div className="fc-visual">
                <img src="/landing/IMG_9010.PNG" alt="Dashboard" />
              </div>
              <div className="fc-body">
                <div className="fc-title">IRPF e IVA en tiempo real</div>
                <div className="fc-desc">Con cada factura que emites, Solvy actualiza tu impuesto acumulado al instante. Sin esperar al trimestre.</div>
              </div>
            </div>
            <div className="fc sa">
              <div className="fc-visual">
                <img src="/landing/IMG_9012.PNG" alt="Impuestos Solvy" />
              </div>
              <div className="fc-body">
                <div className="fc-title">Estimación fiscal siempre lista</div>
                <div className="fc-desc">IRPF, RETA y neto estimado en tiempo real. Sabes exactamente cuánto apartar antes de cada plazo.</div>
              </div>
            </div>
            <div className="fc sar">
              <div className="fc-visual">
                <img src="/landing/IMG_9015.PNG" alt="Documentos" />
              </div>
              <div className="fc-body">
                <div className="fc-title">Libro Registro automático</div>
                <div className="fc-desc">Cada factura registrada sola. Resumen trimestral en PDF listo para tu gestor.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ VERIFACTU ══ */}
      <section className="section-verifactu" id="verifactu">
        <div className="vf-card sa">
          <div>
            <div className="vf-status"><span className="dot"></span>Integración en camino</div>
            <h2 className="vf-h">¿Y VeriFactu?</h2>
            <p className="vf-p">
              En julio de 2027 será obligatorio para autónomos. La integración de Solvy está en camino
              y llegará mucho antes. Salir del Excel hoy ya es medio camino.
            </p>
          </div>
          <div className="vf-steps">
            {VERIFACTU_STEPS.map((step, i) => (
              <div className="vf-step" key={step.when}>
                <span className={i === 0 ? 'vf-dot now' : 'vf-dot'}></span>
                <div>
                  <div className="vf-when">{step.when}</div>
                  <div className="vf-what">{step.what}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FUNDADORA ══ */}
      <section className="section-founder">
        <div className="container">
          <div className="fnd sa">
            {/* Foto reale: public/landing/luana.jpg (quadrata, ~400x400).
                Se manca, resta il monogramma. */}
            <div className="fnd-photo">
              {!founderPhotoMissing && (
                <img
                  src="/landing/luana.jpg"
                  alt="Luana, fundadora de Solvy"
                  width={180}
                  height={180}
                  loading="lazy"
                  decoding="async"
                  onError={() => setFounderPhotoMissing(true)}
                />
              )}
              <span className="fnd-initial" aria-hidden="true">L</span>
            </div>
            <div>
              <div className="eyebrow">Quién está detrás</div>
              <p className="fnd-q">
                No soy gestora. Cuando me hice autónoma en España, el miedo a Hacienda venía incluido.
                Busqué una app que me dijera mi situación en tiempo real — <em>no existía</em>.
                Así que la construí.
              </p>
              <div className="fnd-meta">
                <span className="fnd-name">— Luana, fundadora</span>
                <a className="fnd-ig" href="https://www.instagram.com/solvyapp/" target="_blank" rel="noopener noreferrer">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  @solvyapp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section className="section-pricing" id="pricing">
        <canvas id="shader-pricing" ref={shaderPricingRef}></canvas>
        <div className="container" style={{position:'relative',zIndex:1}}>
          <div className="sa" style={{textAlign:'center'}}>
            <div className="eyebrow">Pricing</div>
            <h2 className="section-h">Elige tu plan.</h2>
            <p style={{fontSize:'17px',color:'var(--muted)',marginTop:'-36px',marginBottom:0}}>Empieza gratis, sin tarjeta.</p>
          </div>
          <div className="pricing-grid">
            <div className="p-card free sa">
              <div className="p-label">Gratis</div>
              <div className="p-price">
                <span className="p-currency">€</span>
                <span className="p-amount">0</span>
              </div>
              <div className="p-period">para siempre</div>
              <div className="p-note">Sin tarjeta · No caduca</div>
              <hr className="p-divider" />
              {FREE_FEATURES.map(f => (
                <div className="p-feat" key={f}><span className="p-check">✓</span> {f}</div>
              ))}
            </div>
            <div className="p-card sa2">
              <div className="p-label">Pro · Mensual</div>
              <div className="p-price">
                <span className="p-currency">€</span>
                <span className="p-amount">14,99</span>
              </div>
              <div className="p-period">al mes</div>
              <div className="p-note">Cancela cuando quieras</div>
              <hr className="p-divider" />
              <div className="p-plus">Todo lo del plan Gratis, y además:</div>
              {PRO_FEATURES.map(f => (
                <div className="p-feat" key={f}><span className="p-check">✓</span> {f}</div>
              ))}
            </div>
            <div className="p-card best sa3">
              <div className="p-best-badge">AHORRA 17%</div>
              <div className="p-label">Pro · Anual</div>
              <div className="p-old">€179,88</div>
              <div className="p-price">
                <span className="p-currency">€</span>
                <span className="p-amount">149,90</span>
              </div>
              <div className="p-period">al año</div>
              <div className="p-note">≈ €12,49/mes · 2 meses gratis</div>
              <hr className="p-divider" />
              <div className="p-plus">Todo lo del plan Gratis, y además:</div>
              {PRO_FEATURES.map(f => (
                <div className="p-feat" key={f}><span className="p-check">✓</span> {f}</div>
              ))}
            </div>
          </div>
          <div className="sa" style={{textAlign:'center',marginTop:'32px'}}>
            <button onClick={onSignup} className="btn-primary" style={{background:'linear-gradient(135deg,#6D28D9,#06B6D4)',color:'#fff',boxShadow:'0 8px 32px rgba(109,40,217,.4)'}}>
              Empieza gratis
            </button>
            <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'12px'}}>Sin tarjeta · Gratis para siempre</p>
          </div>
        </div>
      </section>

      {/* ══ FOOTER CTA ══ */}
      <section className="section-footer">
        <canvas id="shader-footer" ref={shaderFooterRef}></canvas>
        <div className="footer-inner">
          <h2 className="footer-h sa">Tu gestoría fiscal.<br /><span className="g">En tu bolsillo.</span></h2>
          <p className="footer-sub sa2">Más de 5 minutos de confusión fiscal al trimestre es demasiado. Solvy lo resuelve.</p>
          <button onClick={onSignup} className="btn-primary sa3" style={{fontSize:'16px',padding:'16px 36px'}}>
            Empezar gratis →
          </button>
        </div>
        <div className="footer-bottom">
          <span className="footer-ft">tu gestoría fiscal en el bolsillo</span>
          <span className="footer-url">solvyapp.com</span>
        </div>
      </section>

      {/* ══ FOOTER LEGAL / TRUST ══ */}
      <footer className="foot-legal">
        <div className="foot-legal-inner">
          <div className="foot-top">
            <div className="foot-brand">
              <img src="/landing/solvy-icon-1024.png" alt="" />
              <span>SOLVY</span>
            </div>
            <nav className="foot-nav">
              <a href="/privacy">Privacidad</a>
              <a href="/terms">Términos</a>
              <a href="/cookies">Cookies</a>
              <a href="/asesorias">Para asesorías</a>
              <a href="https://www.instagram.com/solvyapp/" target="_blank" rel="noopener noreferrer">Instagram</a>
            </nav>
          </div>
          <div className="foot-badges">
            <span className="foot-badge">
              <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="3"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Pagos seguros con Stripe
            </span>
            <span className="foot-badge">
              <svg width="14" height="14" fill="none" stroke="#38bdf8" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              RGPD
            </span>
            <span className="foot-badge">
              <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Datos alojados en la UE
            </span>
          </div>
          <div className="foot-copy">
            <span>© 2026 Solvy · Luana Messa</span>
            <span>Solvy no presenta declaraciones ni presta asesoramiento fiscal · <a href="mailto:support@solvyapp.com">support@solvyapp.com</a></span>
          </div>
        </div>
      </footer>

      {/* ══ VIDEO DEMO — modal ══ */}
      <div
        className={isDemoOpen ? 'vmodal on' : 'vmodal'}
        role="dialog"
        aria-modal="true"
        aria-label="Vídeo: cómo funciona Solvy"
      >
        <div className="vmodal-bd" onClick={closeDemo}></div>
        <div className="vmodal-box">
          <div className="vmodal-bar">
            <span className="vmodal-title">Cómo funciona Solvy</span>
            <button className="vmodal-close" type="button" aria-label="Cerrar vídeo" onClick={closeDemo}>✕</button>
          </div>
          <div className="vmodal-frame">
            <video
              ref={demoVideoRef}
              src="/landing/demo.mp4"
              controls
              playsInline
              preload="none"
              style={demoUnavailable ? { display: 'none' } : undefined}
              onError={() => setDemoUnavailable(true)}
            />
            <div className={demoUnavailable ? 'vmodal-ph on' : 'vmodal-ph'}>
              <div className="vmodal-ph-icon">▶</div>
              <div className="vmodal-ph-h">El vídeo llega en breve</div>
              <p className="vmodal-ph-p">Estamos grabando el recorrido completo de Solvy. Mientras tanto, puedes empezar gratis y verlo por dentro.</p>
              <button type="button" className="btn-primary" style={{marginTop:'6px'}} onClick={() => { closeDemo(); onSignup(); }}>
                Empieza gratis
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
