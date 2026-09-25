// Frases motivacionales dinámicas diarias para Novagreen IA
export const DAILY_MOTIVATIONAL_QUOTES = [
  "La constancia transforma los pequeños esfuerzos diarios en grandes logros.",
  "La excelencia no es un acto aislado, sino un hábito que cultivamos cada día.",
  "El éxito de hoy comienza con el enfoque y la claridad de tus metas.",
  "Cada historia completada es un paso firme hacia nuestra visión.",
  "La disciplina es el puente entre los objetivos y los resultados extraordinarios.",
  "La colaboración y la agilidad hacen posible lo que parece inalcanzable.",
  "Haz que cada jornada cuente con propósito, enfoque y excelencia.",
  "La innovación nace de la perseverancia y el trabajo en equipo.",
  "Enfócate en el progreso constante: un paso a la vez construye el futuro.",
  "El compromiso con la calidad marca la diferencia en cada entrega.",
  "Tu dedicación inspira y fortalece a todo el equipo.",
  "Transforma cada desafío en una oportunidad de aprendizaje y superación.",
  "La clave de la productividad es priorizar lo verdaderamente importante.",
  "Pequeñas victorias diarias construyen los grandes éxitos del mañana.",
  "Lidera con el ejemplo, colabora con empatía y crea con pasión.",
  "La perseverancia vence lo que la fuerza sola no puede lograr.",
  "Grandes resultados requieren determinación, foco y trabajo sincronizado.",
  "Cada historia bien ejecutada eleva el estándar de toda la organización.",
  "La agilidad radica en responder al cambio con soluciones inteligentes.",
  "El talento suma, pero el trabajo en equipo multiplica los resultados.",
  "Cree en tu capacidad para resolver problemas complejos con elegancia.",
  "La calidad de nuestro trabajo refleja la pasión que ponemos en él.",
  "Un día productivo comienza con metas claras y actitud positiva.",
  "Aprende del proceso, ajusta el rumbo y sigue avanzando con fuerza.",
  "La determinación de hoy es el triunfo asegurado de mañana.",
  "El orden y la claridad en tus historias potencian tu creatividad.",
  "Construyamos juntos soluciones que dejen una huella positiva.",
  "El verdadero progreso se mide en la consistencia de cada jornada.",
  "Sé proactivo, busca soluciones y celebra cada avance del equipo.",
  "Tu esfuerzo diario es el motor que impulsa a toda la empresa.",
  "Enfócate en lo esencial y hazlo con la mayor excelencia posible."
];

export const getDailyMotivationalQuote = (): string => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const quoteIndex = Math.abs(dayOfYear) % DAILY_MOTIVATIONAL_QUOTES.length;
  return DAILY_MOTIVATIONAL_QUOTES[quoteIndex];
};
