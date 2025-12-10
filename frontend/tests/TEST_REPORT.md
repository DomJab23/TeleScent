# Test Execution Report (Frontend)

## Command used
- `cd frontend; $env:CI="true"; npm.cmd test -- --watch=false --runInBand`

## Suites executed (2025-12-10)
- `src/__tests__/ProtectedRoute.test.js` — componente (routing auth guard): PASS — Herramienta: Jest + React Testing Library
  - Redirige a /login sin token; renderiza children con token. Warnings React Router future flags.
- `src/__tests__/NavBar.test.js` — componente (NavBar): PASS — Herramienta: Jest + React Testing Library
  - Logout borra storage y navega a /login (mock navigate).
- `src/__tests__/login.test.js` — componente (SignIn): PASS — Herramienta: Jest + React Testing Library
  - Validacion campos vacios; login ok guarda token/user y navega; login fallo muestra error. Warnings MUI Grid legacy props.
- `src/__tests__/SensorData.test.js` — componente (SensorData page): PASS — Herramienta: Jest + React Testing Library
  - Con datos/prediccion mock renderiza chips y tarjeta ML; SSE mock. Warnings MUI Grid legacy props.
- `src/__tests__/apiConfig.unit.test.js` — unit (apiClient): PASS — Herramienta: Jest + React Testing Library
  - Anade Content-Type y credentials; lanza error con message; lanza HTTP status si body no parsea.
- `src/__tests__/MLConsole.test.js` — componente (MLConsole page): PASS — Herramienta: Jest + React Testing Library
  - Render tabla de predicciones con datos mock; toggle auto-refresh chip. Warnings MUI Grid legacy props.
- `src/__tests__/EmitterSetup.test.js` — componente (EmitterSetup page): FAIL — Herramienta: Jest + React Testing Library
  - No encuentra boton "Assign Smell" ni completa seleccion de categoria (Select MUI y layout con Grid v2 generan queries mas complejas). Pendiente ajustar test o simplificar flujo.

## Notes
- Warnings presentes (no rompen tests que pasan):
  - React Router future flags (v7 startTransition / relative splat).
  - MUI Grid props legacy (`item`, `xs`, `sm`, `md`) al usar Grid v2.
- Estado global frontend: 6 suites PASS, 1 suite FAIL (EmitterSetup).
