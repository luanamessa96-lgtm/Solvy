import { useEffect, useRef } from 'react';
import './LandingView.css';

interface LandingViewProps {
  onSignup: () => void;
  onLogin: () => void;
}

export default function LandingView({ onSignup, onLogin }: LandingViewProps) {
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
              Solvy calcula tu IVA e IRPF en tiempo real, con cada factura que emites. Sin sorpresas en julio. Sin gestor.
            </p>
            <div className="hero-cta sa3">
              <button onClick={onSignup} className="btn-primary">Prueba gratis 7 días</button>
              <a href="#app" className="btn-ghost">Ver cómo funciona →</a>
            </div>
            <p className="hero-note sa3">Sin tarjeta · Cancela cuando quieras</p>
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
            '7,99€/mes · Todo incluido',
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
                <div className="prob-head">Tu gestor cobra demasiado</div>
                <div className="prob-body">80–100€/mes por gestiones que una app puede hacer en segundos. Y encima, no siempre avisa a tiempo.</div>
              </div>
              <span className="prob-tag">Cara dependencia</span>
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

      {/* ══ PRICING ══ */}
      <section className="section-pricing" id="pricing">
        <canvas id="shader-pricing" ref={shaderPricingRef}></canvas>
        <div className="container" style={{position:'relative',zIndex:1}}>
          <div className="sa" style={{textAlign:'center'}}>
            <div className="eyebrow">Pricing</div>
            <h2 className="section-h">Elige tu plan.</h2>
            <p style={{fontSize:'17px',color:'var(--muted)',marginTop:'-36px',marginBottom:0}}>Empieza gratis 7 días. Sin tarjeta.</p>
          </div>
          <div className="pricing-grid">
            <div className="p-card sa">
              <div className="p-label">Mensual</div>
              <div className="p-price">
                <span className="p-currency">€</span>
                <span className="p-amount">7,99</span>
              </div>
              <div className="p-period">al mes</div>
              <div className="p-note">Flexibilidad total</div>
              <hr className="p-divider" />
              {['Facturas ilimitadas','Calendario fiscal completo','Libro Registro automático','Temas personalizados'].map(f => (
                <div className="p-feat" key={f}><span className="p-check">✓</span> {f}</div>
              ))}
            </div>
            <div className="p-card best sa2">
              <div className="p-best-badge">AHORRA 37%</div>
              <div className="p-label">Anual</div>
              <div className="p-old">€95,88</div>
              <div className="p-price">
                <span className="p-currency">€</span>
                <span className="p-amount">59,99</span>
              </div>
              <div className="p-period">al año</div>
              <div className="p-note">≈ €5/mes · 2 meses gratis</div>
              <hr className="p-divider" />
              {['Facturas ilimitadas','Calendario fiscal completo','Libro Registro automático','Temas personalizados'].map(f => (
                <div className="p-feat" key={f}><span className="p-check">✓</span> {f}</div>
              ))}
            </div>
          </div>
          <div className="sa" style={{textAlign:'center',marginTop:'32px'}}>
            <button onClick={onSignup} className="btn-primary" style={{background:'linear-gradient(135deg,#6D28D9,#06B6D4)',color:'#fff',boxShadow:'0 8px 32px rgba(109,40,217,.4)'}}>
              Prueba gratis 7 días
            </button>
            <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'12px'}}>Sin tarjeta · Cancela cuando quieras</p>
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

    </div>
  );
}
