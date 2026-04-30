import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, BookOpen, X } from 'lucide-react';

interface Article {
  title: string;
  body: string;
}

interface Section {
  title: string;
  articles: Article[];
}

const SECTIONS: Section[] = [
  {
    title: 'Los Impuestos',
    articles: [
      {
        title: 'Qué es la AEAT y qué gestiona para los autónomos',
        body: 'La Agencia Estatal de Administración Tributaria es el organismo público que recauda y gestiona los impuestos en España. Como autónomo debes presentar ante la AEAT el Modelo 130 (IRPF trimestral), el Modelo 303 (IVA trimestral) y el Modelo 100 (Renta anual). Todo se tramita en la sede electrónica con certificado digital o Cl@ve.',
      },
      {
        title: 'Cómo funciona la Estimación Directa Simplificada',
        body: 'Es el régimen fiscal estándar para la mayoría de autónomos con ingresos hasta €600.000/año. Pagas impuestos sobre tus ingresos reales menos los gastos deducibles. A diferencia del régimen de módulos, el cálculo es exacto: si tienes más gastos, pagas menos. El tipo de IRPF es progresivo, igual que cualquier contribuyente.',
      },
      {
        title: 'Qué es el Modelo 130 y cuándo se paga',
        body: 'Es el pago fraccionado trimestral del IRPF. Pagas el 20% del rendimiento neto (ingresos − gastos) acumulado desde enero, descontando lo ya pagado en trimestres anteriores. Se presenta: T1 → hasta el 20 de abril · T2 → hasta el 20 de julio · T3 → hasta el 20 de octubre · T4 → hasta el 30 de enero del año siguiente. Si el rendimiento anual estimado es inferior a €1.000 estás exento.',
      },
      {
        title: 'Qué es el Modelo 303 y cómo funciona el IVA trimestral',
        body: 'Es la declaración trimestral del IVA. Calculas la diferencia entre el IVA que has cobrado a tus clientes (IVA repercutido) y el IVA que has pagado en tus gastos (IVA soportado). Si la diferencia es positiva, pagas a Hacienda. Si es negativa, Hacienda te lo devuelve o puedes compensarlo en el siguiente trimestre. Se presenta junto al Modelo 130.',
      },
      {
        title: 'Qué es el Modelo 100 — la Renta anual',
        body: 'Es la declaración anual del IRPF (la "Renta"). La presentas entre abril y junio del año siguiente. En ella regularizas definitivamente lo que debes: si has pagado de más con los Modelos 130, Hacienda te devuelve; si has pagado de menos, pagas la diferencia. Es la liquidación final de tu año fiscal.',
      },
      {
        title: 'Qué es el Modelo 390 — el resumen anual IVA',
        body: 'Es el resumen anual del IVA. Consolida todos los datos de los cuatro Modelos 303 del año y se presenta en enero del año siguiente. No implica pago adicional — es solo informativo para que Hacienda tenga el cuadro completo de tu IVA anual.',
      },
      {
        title: 'Cómo funciona el IRPF para autónomos',
        body: 'El IRPF es progresivo: cuanto más ganas, más porcentaje pagas. Los tipos van del 19% al 47% según tramos. Como autónomo en Estimación Directa, tu base imponible es el rendimiento neto (ingresos − gastos deducibles). El Modelo 130 es el anticipo trimestral; el Modelo 100 es la liquidación final.',
      },
      {
        title: 'Reducción por inicio de actividad — 20% el primer año, 30% el segundo (art. 32.3 LIRPF)',
        body: 'Si inicias una actividad económica en Estimación Directa, puedes aplicar una reducción sobre el rendimiento neto positivo: 20% el primer año en que el rendimiento sea positivo y 30% el segundo año. Esto reduce directamente la base imponible del IRPF — tanto en el Modelo 130 trimestral como en la Renta anual. Ejemplo: rendimiento neto €25.000 → base reducida año 1 = €20.000 (−€5.000). Solvy la aplica automáticamente si has introducido tu año de inicio de actividad en el perfil.',
      },
      {
        title: 'Qué gastos son deducibles y con qué límites',
        body: 'Son deducibles los gastos necesarios para desarrollar tu actividad: software y suscripciones (100%), material de oficina (100%), formación profesional (100%), teléfono (50% si es uso mixto), suministros del hogar en teletrabajo (30% sobre el porcentaje afecto a la actividad), dietas y desplazamientos (con justificante). Los gastos personales nunca son deducibles. Consulta con tu gestor para optimizar.',
      },
    ],
  },
  {
    title: 'La RETA',
    articles: [
      {
        title: 'Qué es la RETA y cómo se calcula la cuota mensual',
        body: 'El Régimen Especial de Trabajadores Autónomos es el sistema de Seguridad Social para autónomos. Desde 2023 la cuota mensual se calcula según tus ingresos reales netos: a más rendimiento neto, más cuota. Hay 15 tramos, desde ~€200/mes hasta ~€590/mes. Cada año se ajusta en función de lo que hayas ganado realmente.',
      },
      {
        title: 'Cuándo y cómo pagar la cuota RETA mensual',
        body: 'La cuota RETA se domicilia automáticamente en tu cuenta bancaria entre los días 20 y 31 de cada mes. No tienes que hacer nada manualmente una vez configurada. Si no tienes domiciliación activa puedes pagar en tu banco o sede electrónica de la Seguridad Social. El impago genera recargos y puede llevarte a baja de oficio.',
      },
      {
        title: 'Qué es el tramo RETA y cuándo cambia tu cuota',
        body: 'Cada año previsor comunicas a la Seguridad Social una estimación de tus ingresos netos para el año. Te asignan el tramo correspondiente y pagas esa cuota mensual. En enero del año siguiente se regulariza: si ganaste más de lo declarado, pagas la diferencia; si ganaste menos, te devuelven. Puedes cambiar de tramo hasta 6 veces al año.',
      },
      {
        title: 'RETA proporcional el año de inicio de actividad',
        body: 'Si te das de alta como autónomo a lo largo del año (no el 1 de enero), solo pagas la cuota RETA por los meses efectivamente dados de alta. Ejemplo: alta en mayo → pagas 8 meses de RETA en lugar de 12. La Seguridad Social calcula la cuota proporcionalmente a los días de alta. Cuando introduzcas tu año de inicio en Solvy, recuerda que la estimación anual de RETA puede ser inferior si te diste de alta mediado el año — consulta con tu gestor el importe exacto.',
      },
    ],
  },
  {
    title: 'Las Facturas',
    articles: [
      {
        title: 'Qué es una factura rectificativa y cuándo emitirla',
        body: 'La factura rectificativa corrige o anula una factura ya emitida. Debes emitirla cuando hay un error en los datos del cliente, en el importe, en el IVA aplicado, o cuando el cliente devuelve el servicio. Nunca modifiques una factura ya emitida — emite siempre la rectificativa. Hace referencia al número de la factura original.',
      },
      {
        title: 'Cuándo emitir una rectificativa en trimestre diferente',
        body: 'Si emites una rectificativa en un trimestre diferente al de la factura original, la rectificativa se computa en el trimestre en que se emite, no en el original. Esto puede afectar al IVA del trimestre actual y al rendimiento neto del Modelo 130. Solvy lo gestiona automáticamente según la fecha de la rectificativa.',
      },
      {
        title: 'Qué es un presupuesto y cómo convertirlo en factura',
        body: 'El presupuesto es un documento no fiscal que propones al cliente antes de confirmar el trabajo. No cuenta para el facturado ni va a Hacienda. Una vez el cliente acepta, lo conviertes en factura definitiva con un solo click en Solvy — todos los datos se transfieren automáticamente y se asigna el número de factura correspondiente.',
      },
      {
        title: 'Qué campos son obligatorios en una factura española',
        body: 'Una factura española debe incluir: número correlativo, fecha de emisión, tus datos (nombre/razón social, NIF, dirección), datos del cliente (nombre/razón social, NIF si es empresa), descripción del servicio, base imponible, tipo de IVA aplicado, cuota de IVA, importe total. Si hay retención IRPF, también debe indicarse el porcentaje y el importe.',
      },
      {
        title: 'Qué es la retención IRPF — por qué es 7% o 15%',
        body: 'La retención es un anticipo del IRPF que el cliente retiene de tu factura y lo ingresa a Hacienda por ti. El 7% es el tipo reducido para autónomos en sus primeros 3 años de actividad. El 15% es el tipo general a partir del cuarto año. Solo se aplica cuando facturas a empresas o profesionales — nunca a particulares. El cliente te paga el total menos la retención.',
      },
      {
        title: 'Facturas a clientes de la UE — operaciones intracomunitarias',
        body: 'Si facturas a un cliente de otro país de la Unión Europea (empresa o profesional con NIF comunitario), la operación es intracomunitaria: no aplicas IVA español. El mecanismo se llama "inversión del sujeto pasivo" (art. 194 Directiva IVA 2006/112/CE) — el cliente declara y liquida el IVA en su propio país. Tu factura debe indicar explícitamente esta condición. En Solvy activa el toggle "Cliente UE — Operación intracomunitaria" al crear la factura: el IVA se pone a 0% automáticamente, la factura incluye la nota legal obligatoria y el importe no entra en tu IVA repercutido del Modelo 303. Importante: el importe sí computa como ingreso para el IRPF (Modelo 130 y 100).',
      },
    ],
  },
  {
    title: 'Los Libros Registro',
    articles: [
      {
        title: 'Qué es el Libro Registro de Facturas Emitidas',
        body: 'Es el registro obligatorio de todas las facturas que has emitido a tus clientes. Debe incluir: número de factura, fecha, datos del cliente, base imponible, IVA y total. La AEAT puede solicitarlo en cualquier momento. Solvy lo genera automáticamente en PDF con todos los campos obligatorios AEAT desde el Resumen Trimestral.',
      },
      {
        title: 'Qué es el Libro Registro de Facturas Recibidas',
        body: 'Es el registro de todas las facturas de gastos que has recibido de tus proveedores. Debe incluir número de factura del proveedor, fecha, NIF del proveedor, base imponible e IVA soportado. Es fundamental para justificar la deducción del IVA soportado en el Modelo 303. Solvy lo genera desde el Resumen Trimestral.',
      },
      {
        title: 'Diferencia entre facturas emitidas y recibidas',
        body: 'Emitidas → las que tú envías a tus clientes por tus servicios (generan ingresos e IVA repercutido). Recibidas → las que recibes de tus proveedores por tus gastos (generan IVA soportado deducible). La diferencia entre IVA repercutido e IVA soportado es lo que pagas o te devuelven en el Modelo 303.',
      },
      {
        title: 'Por cuánto tiempo conservar las facturas en España — 4 años',
        body: 'En España debes conservar todas las facturas, tanto emitidas como recibidas, durante un mínimo de 4 años desde que venció el plazo de presentación del impuesto correspondiente. En la práctica, muchos gestores recomiendan guardar 5-6 años por seguridad. Solvy guarda tus facturas digitalmente en el Archivo para facilitar esta conservación.',
      },
    ],
  },
  {
    title: 'El IVA',
    articles: [
      {
        title: 'Diferencia entre IVA repercutida y IVA soportada',
        body: 'IVA repercutido → el IVA que cobras a tus clientes en tus facturas. Lo recaudas en nombre de Hacienda y debes ingresarlo. IVA soportado → el IVA que pagas en tus gastos y compras de negocio. Lo puedes deducir. La diferencia trimestral (repercutido − soportado) es lo que declaras en el Modelo 303: positivo = pagas, negativo = Hacienda te devuelve.',
      },
      {
        title: 'IVA soportado deducible: por qué el teléfono solo cuenta al 50%',
        body: 'No todo el IVA que pagas en tus gastos es deducible al 100%. La ley establece límites según el uso del bien: teléfono móvil y línea de datos → 50% deducible (uso mixto personal/profesional estimado por Hacienda). Suministros del hogar en teletrabajo → 30% del porcentaje afecto a la actividad. Software, material de oficina, formación, suscripciones profesionales → 100% deducible. Ejemplo: factura de teléfono con IVA €21 → solo puedes deducir €10,50. Solvy aplica estos límites automáticamente al calcular el IVA soportado del Modelo 303.',
      },
      {
        title: 'Cómo funciona el cálculo acumulativo del Modelo 130',
        body: 'El Modelo 130 no es solo del trimestre — es acumulativo desde enero. Calculas el 20% del rendimiento neto total del año hasta el fin del trimestre actual, y restas lo ya pagado en trimestres anteriores. Así en T3 pagas solo la diferencia respecto a T1+T2. Esto evita pagar de más si un trimestre fue malo y otro muy bueno.',
      },
      {
        title: 'Qué es el mínimo exento del Modelo 130 (€1.000)',
        body: 'Si tu rendimiento neto anual estimado es inferior a €1.000, estás exento del pago fraccionado del Modelo 130 — la cuota es €0. Solvy detecta automáticamente esta situación y te muestra una nota informativa en el Resumen Trimestral. Debes presentar igualmente el Modelo si tu gestor lo considera necesario según tu situación.',
      },
    ],
  },
  {
    title: 'Herramientas Solvy',
    articles: [
      {
        title: 'Cómo funciona el Resumen Trimestral y qué incluir',
        body: 'El Resumen Trimestral calcula automáticamente el Modelo 130 y el Modelo 303 del trimestre seleccionado. Puedes añadir opcionalmente: Libro de Facturas Emitidas, Libro de Facturas Recibidas, facturas y gastos del trimestre en PDF, Resumen Anual, Resumen Anual IVA. Es la herramienta central para preparar tu documentación trimestral.',
      },
      {
        title: 'Cómo organizar y enviar documentos a tu gestor con Solvy',
        body: 'Desde el Resumen Trimestral puedes generar y enviar todos los documentos en un solo paso: el PDF del resumen fiscal, los libros registro y las facturas del período. Usa el botón "Enviar al Gestor" para compartir directamente por email o apps de mensajería. Tu gestor recibe todo ordenado y listo para presentar.',
      },
      {
        title: 'Qué es el Archivo Solvy y por qué está en Fiscalidad',
        body: 'El Archivo Solvy es un backup digital de todas tus facturas organizadas por año. Está en la sección Fiscalidad porque es un instrumento de conservación fiscal — obligatorio por ley conservar facturas 4 años. No es una operación diaria sino un documento de referencia que el gestor puede necesitar en caso de inspección.',
      },
      {
        title: 'Cómo interpretar la estimación fiscal del dashboard',
        body: 'El dashboard muestra una estimación del IRPF e la RETA anuales basada en tus ingresos actuales. No es el importe definitivo — es una proyección para que puedas planificar. El IRPF real se liquida con el Modelo 100 (Renta). La RETA se regulariza en enero del año siguiente. Úsalo como referencia, no como cifra exacta.',
      },
      {
        title: 'Qué significa "Aparta para impuestos" y cómo funciona',
        body: '"Aparta para impuestos" es una función Pro que calcula cuánto dinero deberías reservar cada mes para no tener sorpresas en las fechas de pago. La fórmula es: (IRPF estimado + RETA anual) ÷ meses restantes del año. Es una estimación — el importe real puede variar. Úsala como guía para tu planificación financiera.',
      },
      {
        title: 'Cómo funcionan las retenciones subidas en el dashboard',
        body: 'Si tienes facturas con retención IRPF, el dashboard muestra el total retenido por tus clientes durante el año. Este importe ya fue ingresado a Hacienda por ellos — se descuenta de lo que pagarás en la Renta anual (Modelo 100). No lo confundas con el Modelo 130: las retenciones y los pagos fraccionados son mecanismos distintos.',
      },
      {
        title: 'Cómo usar el Libro Registro desde el Resumen Trimestral',
        body: 'En el Resumen Trimestral activa los toggles "Libro Facturas Emitidas" y/o "Libro Facturas Recibidas" antes de descargar. Solvy generará un PDF con todos los campos obligatorios AEAT para el año completo — no solo el trimestre. Puedes enviarlo directamente a tu gestor junto al resumen fiscal trimestral.',
      },
      {
        title: 'Cómo enviar facturas y gastos trimestrales al gestor',
        body: 'Activa los toggles "Facturas del trimestre" y "Gastos del trimestre" en el Resumen Trimestral. Se generarán PDFs separados con solo los documentos del período seleccionado. Tu gestor podrá revisar cada factura y gasto individualmente. Es complementario al resumen fiscal — no lo sustituye.',
      },
      {
        title: 'Diferencia entre envío periódico al gestor y Archivo Solvy',
        body: 'El envío periódico es para el trabajo trimestral del gestor: resumen fiscal + libros + facturas del período. El Archivo Solvy es un backup anual de toda tu documentación para conservación legal. Son complementarios: el primero es operativo, el segundo es de conservación. Ambos están disponibles desde la sección Fiscalidad.',
      },
    ],
  },
  {
    title: 'Declaraciones',
    articles: [
      {
        title: 'Qué es el Resumen Anual y cuándo mandarlo al gestor',
        body: 'El Resumen Anual consolida todos los ingresos, gastos, IVA y IRPF del año completo. Es el documento base que el gestor necesita para presentar el Modelo 100 (Renta) y el Modelo 390 (resumen anual IVA) en enero-junio del año siguiente. Envíaselo en enero junto a la documentación de T4.',
      },
      {
        title: 'Diferencia entre Mod. 100 y Mod. 390',
        body: 'Modelo 100 → declaración anual del IRPF (la Renta). Regulariza definitivamente lo que debes de IRPF considerando ingresos, gastos, retenciones y pagos fraccionados del año. Modelo 390 → resumen anual del IVA. Consolida los cuatro Modelos 303 presentados durante el año. Son complementarios y se presentan en fechas similares.',
      },
      {
        title: 'Qué hace el gestor con tus documentos trimestrales',
        body: 'El gestor revisa ingresos y gastos, verifica la correcta aplicación del IVA y las retenciones, calcula el rendimiento neto y presenta el Modelo 130 y el Modelo 303 ante la AEAT. También te asesora sobre optimización fiscal y te avisa de posibles errores. Por eso es importante enviarle la documentación completa y organizada cada trimestre.',
      },
    ],
  },
  {
    title: 'Límites y Casos Especiales',
    articles: [
      {
        title: 'Qué pasa si no presentas el Modelo 130 a tiempo',
        body: 'La presentación fuera de plazo genera un recargo automático: 1% por mes de retraso hasta 12 meses (sin requerimiento previo de Hacienda), más intereses de demora. Si Hacienda te reclama antes de que presentes, el recargo es del 15% más intereses. Presenta siempre en plazo, aunque no tengas que pagar nada — la presentación en cero también es obligatoria.',
      },
      {
        title: 'Cómo corregir un error en una factura ya emitida',
        body: 'No modifiques nunca una factura ya emitida. Si hay un error en el importe, NIF, descripción o IVA, debes emitir una factura rectificativa que haga referencia a la factura original. La rectificativa puede ser de sustitución (reemplaza la original) o de diferencia (solo el importe erróneo). En Solvy usa "Factura Rectificativa" desde el menú de creación.',
      },
      {
        title: 'Cuándo necesitas un gestor fiscal en España',
        body: 'Técnicamente puedes gestionar tus impuestos tú mismo. En la práctica, un gestor es muy recomendable si: tienes ingresos variables o múltiples fuentes, facturas con retenciones, gastos de difícil clasificación, o si quieres optimizar tu carga fiscal. El coste de un gestor (~€50-150/mes) suele recuperarse con creces en ahorro fiscal y tranquilidad.',
      },
      {
        title: 'Solvy no cubre: pluriactividad, prorrata IVA — qué hacer',
        body: 'Solvy está diseñado para autónomos en Estimación Directa Simplificada con actividad única. No gestiona: pluriactividad (autónomo + trabajador por cuenta ajena), prorrata de IVA (cuando tienes operaciones exentas y no exentas), regímenes especiales de IVA, ni sociedades limitadas. Para estos casos es imprescindible un gestor especializado.',
      },
      {
        title: 'Diferencia entre autónomo y sociedad limitada en España',
        body: 'Autónomo → respondes con tu patrimonio personal, fiscalidad por IRPF (progresivo). Sociedad Limitada (SL) → persona jurídica separada, responsabilidad limitada al capital social, tributación por Impuesto de Sociedades (25% general). La SL conviene generalmente a partir de ~€60.000-80.000 de beneficio neto. Consulta con un gestor para tu caso concreto.',
      },
    ],
  },
  {
    title: 'Islas Canarias — IGIC',
    articles: [
      {
        title: 'Qué es el IGIC y en qué se diferencia del IVA',
        body: 'El Impuesto General Indirecto Canario (IGIC) es el equivalente al IVA en las Islas Canarias. Funciona igual — lo cobras a tus clientes, deduces el IGIC de tus gastos y declaras la diferencia trimestralmente — pero con diferencias clave: el tipo general es el 7% frente al 21% peninsular, y lo gestiona el Gobierno de Canarias, no la AEAT estatal. Las Canarias tienen un régimen fiscal especial reconocido en la Constitución y en la normativa de la UE.',
      },
      {
        title: 'Tipos de IGIC — cuál aplica a tus facturas',
        body: 'El IGIC tiene cinco tipos: 0% (bienes de primera necesidad, sanidad, educación), 3% (tipo reducido — vivienda, transporte, determinados alimentos), 7% (tipo general — el habitual para servicios profesionales), 9,5% (tipo incrementado — tabaco, bebidas alcohólicas) y 15% (tipo especial — artículos de lujo, embarcaciones). Como autónomo que presta servicios profesionales aplicarás el 7% en la mayoría de los casos. Si tienes dudas sobre tu actividad concreta, consulta con tu gestor.',
      },
      {
        title: 'Cómo funciona el IGIC en tus facturas como autónomo canario',
        body: 'El mecanismo es idéntico al IVA: cobras el IGIC a tus clientes (IGIC repercutido), pagas IGIC en tus gastos (IGIC soportado) y declaras la diferencia. Si el resultado es positivo, pagas al Gobierno de Canarias; si es negativo, te lo devuelven o compensas en el trimestre siguiente. En Solvy, si has seleccionado "Islas Canarias" como territorio en el onboarding, el IGIC se aplica automáticamente en tus facturas con el tipo configurado en el perfil.',
      },
      {
        title: 'Retención IRPF e IGIC: cómo conviven en tus facturas',
        body: 'El IGIC no sustituye al IRPF — son impuestos distintos e independientes. Como autónomo canario sigues presentando el Modelo 130 (IRPF trimestral) exactamente igual que en la península. Tu factura incluye: base imponible + IGIC − retención IRPF. La retención sigue siendo el 7% los primeros tres años de actividad y el 15% a partir del cuarto. Solvy gestiona ambos automáticamente.',
      },
      {
        title: 'El Modelo 425 — resumen anual IGIC',
        body: 'El Modelo 425 es la declaración-resumen anual del IGIC, gestionada por la Agencia Tributaria Canaria (no por la AEAT). Es el equivalente canario del Modelo 390 peninsular: consolida las cuatro declaraciones trimestrales del año y se presenta antes del 30 de enero del año siguiente. No implica pago adicional — es informativo. Solvy genera el "Resumen Anual IGIC" desde el Resumen Trimestral con la nomenclatura correcta (Modelo 425) para que puedas enviárselo a tu gestor.',
      },
      {
        title: 'La Franquicia del minorista — exención IGIC hasta €30.000',
        body: 'Si tu facturación anual no supera los €30.000, puedes acogerte al régimen de franquicia del minorista: no cobras IGIC a tus clientes y no presentas el Modelo 420. Ventaja: menos burocracia trimestral y facturas más sencillas. Inconveniente: tampoco puedes deducir el IGIC que pagas en tus gastos. Conviene si tus clientes son particulares (no pueden recuperar el IGIC) y tus gastos con IGIC son bajos. Si superas los €30.000 durante el año, debes salir del régimen inmediatamente. Consulta con tu gestor si esta opción es adecuada para tu situación.',
      },
      {
        title: 'La RIC — Reserva para Inversiones en Canarias',
        body: 'La Reserva para Inversiones en Canarias es uno de los mayores incentivos fiscales del sistema español para autónomos. Puedes deducir en el IRPF hasta el 80-90% de los beneficios que destines a una reserva, siempre que esos fondos se reinviertan en activos en Canarias dentro de los 3 años siguientes. Ejemplo: beneficio neto €40.000 → hasta €32.000 deducibles de la base imponible del IRPF. El ahorro fiscal puede ser muy significativo. Los activos deben estar afectos a la actividad y ubicados en las Islas Canarias. Es una medida de alta complejidad — imprescindible contar con un gestor especializado en fiscalidad canaria para aplicarla correctamente.',
      },
      {
        title: 'Otros territorios especiales: Baleares, Ceuta y Melilla — qué cubre Solvy',
        body: 'España tiene otros territorios con particularidades fiscales. Baleares aplica el IVA peninsular estándar (21%/10%/4%) — ninguna diferencia respecto a Madrid o Barcelona, Solvy lo gestiona correctamente. Ceuta y Melilla tienen el IPSI (Impuesto sobre la Producción, los Servicios y la Importación), con tipos muy inferiores al IVA y una normativa propia. Solvy cubre la fiscalidad peninsular (IVA) y canaria (IGIC) — si operas en Ceuta o Melilla, los cálculos de Solvy no reflejan tu situación real. Consulta con un gestor especializado en IPSI.',
      },
    ],
  },
];

interface GuiaFiscalESViewProps {
  darkMode?: boolean;
}

const GuiaFiscalESView = ({ darkMode }: GuiaFiscalESViewProps) => {
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.map(s => ({
      ...s,
      articles: s.articles.filter(
        a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
      ),
    })).filter(s => s.articles.length > 0);
  }, [query]);

  const isSearching = query.trim().length > 0;

  const toggleSection = (idx: number) => {
    setOpenSection(prev => (prev === idx ? null : idx));
    setOpenArticle(null);
  };

  const toggleArticle = (key: string) => {
    setOpenArticle(prev => (prev === key ? null : key));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="p-4 pb-28 space-y-3"
    >
      {/* Header */}
      <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-primary" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Guía Fiscal España</h2>
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>52 artículos · 9 secciones · solo España</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <Search size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar en la guía..."
          className={`flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 ${darkMode ? 'text-white' : 'text-slate-900'}`}
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 active:scale-90 transition-transform">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className={`p-6 rounded-2xl border text-center ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Sin resultados para "{query}"</p>
        </div>
      ) : (
        filtered.map((section, sIdx) => {
          const isOpen = isSearching || openSection === sIdx;
          return (
            <div
              key={section.title}
              className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}
            >
              {!isSearching && (
                <button
                  onClick={() => toggleSection(sIdx)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors active:scale-[0.99] ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {sIdx + 1}
                    </span>
                    <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{section.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{section.articles.length}</span>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                    </motion.div>
                  </div>
                </button>
              )}

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {isSearching && (
                      <div className="px-5 pt-4 pb-1">
                        <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{section.title}</span>
                      </div>
                    )}
                    <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
                      {section.articles.map((article, aIdx) => {
                        const articleKey = `${sIdx}-${aIdx}`;
                        const isArticleOpen = openArticle === articleKey;
                        return (
                          <div key={article.title}>
                            <button
                              onClick={() => toggleArticle(articleKey)}
                              className={`w-full flex items-start justify-between px-5 py-3.5 text-left gap-3 transition-colors active:scale-[0.99] ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}`}
                            >
                              <span className={`text-sm leading-snug flex-1 ${isArticleOpen ? 'text-primary font-semibold' : (darkMode ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium')}`}>
                                {article.title}
                              </span>
                              <motion.div animate={{ rotate: isArticleOpen ? 180 : 0 }} transition={{ duration: 0.18 }} className="shrink-0 mt-0.5">
                                <ChevronDown size={14} className={isArticleOpen ? 'text-primary' : (darkMode ? 'text-slate-600' : 'text-slate-400')} />
                              </motion.div>
                            </button>

                            <AnimatePresence initial={false}>
                              {isArticleOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <p className={`px-5 pb-4 text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {article.body}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}
    </motion.div>
  );
};

export default GuiaFiscalESView;
