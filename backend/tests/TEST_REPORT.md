# Test Execution Report

This file records backend test runs for reporting.

## Command used
- `cd backend; $env:NODE_ENV="test"; npx.cmd jest --runInBand`

## Suites executed (2025-12-10)
- `tests/auth.test.js` - integracion API auth: 4/4 PASS - Herramienta: Jest (Node)
  - Registro ok devuelve token; duplicado 400; login ok; login contrasena incorrecta 401.
- `tests/profile.test.js` - integracion API profile: 4/4 PASS - Herramienta: Jest (Node)
  - GET profile sin token 401; GET con token devuelve user sin password; PUT con token actualiza nombres; PUT sin token 401.
- `tests/sensorData.test.js` - integracion API sensor-data: 6/6 PASS - Herramienta: Jest (Node)
  - POST sin device_id 400; trim a 100 lecturas; GET resumen; GET /:deviceId con limit; emitter global ceros sin pred; emitter por device devuelve control guardado.
- `tests/predictionsStats.test.js` - integracion API predictions/stats: 6/6 PASS - Herramienta: Jest (Node)
  - Predictions vacio totalDevices 0; 404 por device inexistente; devuelve pred almacenada; stats vacio; stats por device 404; stats agregan latestData/totalReadings.
- `tests/predictionService.unit.test.js` - unit helpers: 4/4 PASS - Herramienta: Jest (Node)
  - scentToEmitterControl mapea canal/intensidad minima; desconocido todo 0; getPrediction exit!=0 retorna error; processSensorData no reprocesa lectura con mismo lastProcessedTime.
- `tests/authMiddleware.unit.test.js` - unit middleware JWT: 4/4 PASS - Herramienta: Jest (Node)
  - 401 sin token; 403 token invalido; 401 user no existe; exito adjunta user y llama next.
- `tests/userModel.unit.test.js` - unit modelo User: 3/3 PASS - Herramienta: Jest (Node)
  - Hash en create/update; comparePassword true/false; toJSON oculta password.

## Notes
- Warnings esperados en consola: `Frontend build not found. Run "npm run build" in frontend directory.` (solo informativo).

## Manual testing (Thunder Client)
- Auth register (POST /api/auth/register) — PASS — 201 con token y user.id. Duplicado (mismo email) — PASS — 400.
- Auth login (POST /api/auth/login) — PASS — 200 con token.
- Profile (GET/PUT /api/auth/profile con Authorization Bearer) — PASS — 200 devuelve usuario y actualiza firstName/lastName. Sin token — PASS — 401.
- Sensor data: POST valido — PASS — 200 (registro creado). POST sin device_id — PASS — 400. GET listado — PASS — 200 incluye la lectura. GET /dev-1?limit=1 — PASS — 200 max 1 item.
- Predictions — NO EJECUTADO manualmente (endpoint no accesible en la sesion; cubierto por tests automatizados).
- 404 control (GET /api/lo-que-sea) — PASS — 404 JSON.
