# KRONOS — Roadmap Completo

> Este documento es el plan maestro del proyecto. Se actualiza semanalmente.
> Última actualización: Mayo 2026

---

## Visión

Demostrar que un agente de IA puede, partiendo de $0 y sin intervención humana constante:
1. Generar el dinero suficiente para comprarse su propio hardware de inferencia local
2. Con ese hardware, operar sin costos de API externos
3. Usar esa autonomía para adquirir y operar micro-negocios digitales

---

## Fases del Proyecto

### Fase 0 — Infraestructura (Semanas 1–2)
**Estado: EN CURSO**

#### Objetivos
- Repo GitHub configurado y funcionando
- Entorno local operativo con `npm run dev`
- Telegram bot conectado para alertas
- Supabase configurado para memoria persistente
- Primer ciclo diario ejecutado exitosamente en DRY_RUN

#### Tareas técnicas
- [x] Estructura de directorios del proyecto
- [x] Orchestrator con sistema de fases
- [x] Safety guardrails con budget caps
- [x] Human-in-the-loop via Telegram
- [x] Memoria persistente (Supabase + fallback en memoria)
- [ ] Conectar Resend API para envío de emails
- [ ] Playwright headless para scraping de leads
- [ ] Primer test de ciclo completo en dry-run
- [ ] Deploy en Railway/Fly.io para ejecución 24/7

#### Entregables
- Repositorio público en GitHub
- README con instrucciones de setup
- `.env.example` completo
- Video de demo de 2 min del primer ciclo

---

### Fase 1 — Bootstrap (Semanas 2–6)
**Target: $4,000–7,000 USD acumulado**

#### Estrategia principal: Sprint de Auditorías AI
El agente identifica empresas chilenas, genera propuestas personalizadas y entrega reportes de automatización en 48 horas.

##### Flujo de trabajo del agente
```
Lunes AM:    Researcher → 10 nuevos prospectos (clínicas dentales, inmobiliarias, estudios contables)
Lunes PM:    Executor → 5 emails de outreach personalizados
Martes:      Executor → Follow-up + gestión de respuestas
Miércoles:   Executor → Discovery call (con guión generado por agente)
Jueves:      Analyst → Genera reporte de auditoría (1,500 palabras)
Viernes:     Executor → Entrega reporte + propuesta de servicios recurrentes
```

##### Targets por semana
| Semana | Emails enviados | Respuestas esperadas | Auditorías cerradas | Revenue |
|--------|----------------|---------------------|--------------------|---------:|
| 2 | 25 | 3–4 | 1 | $600 |
| 3 | 30 | 4–5 | 2 | $1,200 |
| 4 | 30 | 5–6 | 3 | $1,800 |
| 5 | 30 | 5–6 | 3 | $1,800 |
| **Total** | **115** | **17–21** | **9** | **$5,400** |

#### Estrategia paralela: Funding
Mientras el agente genera ingresos, también aplica a:
- CORFO Expande (convocatoria abierta)
- Anthropic Fellows Program (julio 2026)
- Sponsorships de herramientas AI (Retell, Synthflow, Supabase)
- Contenido en TikTok/Twitter documentando el experimento

#### Criterio de salida de Fase 1
- Acumulado ≥ $4,000 USD, O
- Funding aprobado por importe equivalente, O
- Sponsorship cerrado que cubra el hardware

---

### Fase 2 — Adquisición de Hardware (Semana 6–7)
**Target: Compra de MacBook Pro M5 Max**

#### Configuración objetivo
- MacBook Pro 16" M5 Max
- 128GB RAM unificada (crítico para LLMs locales grandes)
- 2TB SSD mínimo
- Precio: ~$6,200–7,200 USD (configuración máxima)

#### Por qué importa el hardware
Con 128GB RAM unificada, KRONOS puede correr:
- **Llama 3.3 70B** (cuantizado Q4): razonamiento general sin costos de API
- **Hermes-3 70B** (Nous Research): optimizado para function calling y agentic tasks
- **Qwen 2.5 72B**: análisis de documentos y contratos
- **Mistral Large local**: redacción y outreach en español

Impacto en costos: Razonamiento interno del agente baja de ~$8–15/día en API a $0.
El ahorro cubre el hardware en 6–18 meses dependiendo del volumen.

---

### Fase 3 — Transición a Inferencia Local (Semanas 8–10)
**Estado: POST HARDWARE**

#### Setup técnico
- Ollama para gestión de modelos locales
- Actualizar `config.modelLocal` con endpoint local
- Router inteligente: local para tareas simples, Claude API para razonamiento complejo
- Benchmark: velocidad y calidad de modelos locales vs. cloud

#### Modelos a instalar en orden de prioridad
1. `hermes-3:70b-q4_K_M` — primary reasoning (agentic, function calling)
2. `llama3.3:70b-instruct-q4_K_M` — fallback general
3. `qwen2.5:72b-instruct-q4_K_M` — analysis and documents
4. `mistral-large:latest` — Spanish writing tasks

#### Actualización del código
- [ ] Añadir soporte para OpenAI-compatible local endpoint en config
- [ ] Implementar model router con fallback automático
- [ ] Tests de quality regression antes de hacer switch
- [ ] Benchmark: tokens/segundo, latencia, costo por tarea

---

### Fase 4 — Adquisición de Micro-Negocios (Mes 3–6)
**Target: Adquirir 1–2 micro-SaaS con MRR existente**

#### Tesis de inversión
Comprar micro-SaaS descuidados con $500–2,000 MRR a múltiplos de 2–4x (precio $1,000–8,000).
Con el agente operando localmente (costo marginal ~$0), mejorar el producto y revender a 6–8x en 6 meses.

#### Plataformas de búsqueda
- Acquire.com (principal)
- MicroAcquire
- Flippa (más bajo precio, más ruido)
- Indie Hackers community

#### Criterios de selección para adquisición
- MRR: $300–2,000/mes
- Churn < 5% mensual
- Precio ≤ 4x MRR anual
- Nicho: LATAM, español, o B2B con bajo soporte
- Sin dependencia de fundador para operación diaria

#### Flujo de due diligence (agente semi-autónomo)
```
Analyst → Analiza métricas de la plataforma (MRR, churn, traffic)
Researcher → Investiga competencia, nicho, reviews
Analyst → Genera reporte de due diligence en 2 horas
Operator → Revisa y decide (30 min)
Executor → Prepara carta de oferta
Operator → Aprueba envío
```

---

### Fase 5 — Escala Autónoma (Mes 6+)
**Target: $5,000–15,000 MRR operado de forma semi-autónoma**

#### Portfolio objetivo
- 2–3 micro-SaaS operando con soporte mínimo
- 5–10 clientes de Voice AI recurrentes
- 1 producto propio (Kronos Starter o similar)
- Contenido que genera leads pasivamente

#### Rol del operador humano en Fase 5
- Revisar reportes semanales (30 min/semana)
- Aprobar adquisiciones y gastos >$500
- Estrategia trimestral (2h cada 3 meses)
- Excepciones y edge cases cuando el agente escala

---

## Stack Tecnológico

| Capa | Herramienta | Propósito |
|------|------------|----------|
| AI (cloud) | Claude Sonnet 4.6 | Razonamiento y decisiones |
| AI (cloud) | Claude Haiku 4.5 | Tareas high-volume, bajo costo |
| AI (local) | Hermes-3 70B + Ollama | Razonamiento local sin API cost |
| Persistencia | Supabase (PostgreSQL) | Memoria, CRM, logs |
| Email | Resend | Outreach transaccional |
| Notificaciones | Telegram Bot | Human-in-the-loop |
| Browser | Playwright / Browserbase | Scraping y navegación |
| Pagos | Stripe | Cobros a clientes |
| Runtime | Node.js 20 + TypeScript | Core del agente |
| Deploy | Railway / Fly.io | Ejecución 24/7 cloud |
| Repo | GitHub | Control de versiones + CI |

---

## Métricas de Éxito

### Financieras
| Métrica | Target Semana 4 | Target Mes 3 | Target Mes 6 |
|---------|----------------|-------------|-------------|
| Revenue total | $4,000 | $12,000 | $30,000 |
| MRR | $0 | $2,000 | $6,000 |
| Clientes activos | 5 | 15 | 35 |
| Hardware adquirido | Sí/No | — | — |

### Técnicas
| Métrica | Target |
|---------|--------|
| Ciclos diarios sin errores | >90% |
| Tareas completadas sin intervención | >80% |
| Tiempo de respuesta ciclo completo | <30 min |
| Costo API/día | <$8 USD |

### Producto
| Métrica | Target Mes 2 |
|---------|-------------|
| Kronos Starter ventas | 10+ |
| Revenue producto | $3,000+ |
| NPS compradores | >8/10 |

---

## Registro de Decisiones

| Fecha | Decisión | Razón |
|-------|---------|-------|
| Mayo 2026 | TypeScript > Python | Mejor tipado para sistema multi-agente complejo |
| Mayo 2026 | Supabase para memoria | Ya conectado en el stack, gratis hasta cierto volumen |
| Mayo 2026 | Telegram para H-in-L | Más rápido que email para aprobaciones |
| Mayo 2026 | Playbook auditorías primero | Más rápido al dinero, sin infra técnica para el cliente |
| Mayo 2026 | Railway para deploy | Más simple que AWS para MVP, $5/mes |

---

## Changelog

### v0.1.0 — Mayo 2026
- Estructura inicial del proyecto
- Orchestrator con sistema de fases
- Safety guardrails completos
- Agentes: Orchestrator, Researcher, Executor, Reporter
- Memoria persistente (Supabase + fallback)
- Setup wizard para Kronos Starter
