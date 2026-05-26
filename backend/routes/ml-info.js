const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const MODEL_DIR = path.join(__dirname, '..', '..', 'ml', 'model');
const PRODUCTION_PATH = path.join(MODEL_DIR, 'production.json');
const METRICS_PATH = path.join(MODEL_DIR, 'metrics.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

router.get('/', (req, res) => {
  const production = readJson(PRODUCTION_PATH) || {};
  const metrics = readJson(METRICS_PATH) || {};

  const classes = production.classes || metrics.classes || [];
  const holdout = metrics.holdout?.report || null;
  const accuracy = holdout && holdout.accuracy != null ? holdout.accuracy : null;
  const macroF1 = holdout && holdout['macro avg']?.['f1-score'] != null
    ? holdout['macro avg']['f1-score']
    : null;

  res.json({
    model: {
      name: production.model_name || metrics.production_model || 'unknown',
      kind: production.kind || metrics.production_kind || null,
      classes,
      featuresIn: metrics.features_in || [],
      featuresEngineered: metrics.features_engineered || [],
    },
    metrics: {
      cvMacroF1: production.cv_macro_f1 ?? metrics.cv_macro_f1_production ?? null,
      holdoutAccuracy: accuracy,
      holdoutMacroF1: macroF1,
      latencyMs: metrics.latency_ms?.mean_ms ?? null,
      testRows: metrics.holdout?.n_test_rows ?? null,
    },
    perClass: holdout
      ? classes.map((c) => ({
          scent: c,
          precision: holdout[c]?.precision ?? null,
          recall: holdout[c]?.recall ?? null,
          f1: holdout[c]?.['f1-score'] ?? null,
          support: holdout[c]?.support ?? null,
        }))
      : [],
  });
});

module.exports = router;
