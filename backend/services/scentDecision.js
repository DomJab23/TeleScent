const { predictionStore } = require('./dataStore');

const VOC_NO2_DROP_THRESHOLD = 4;
const CONSECUTIVE_FORCE_LIMIT = 3;

function detectVocNo2Drop(history, entry) {
  if (!history || history.length < 2) return { dropped: false, rose: false };
  const prev = history[history.length - 2];
  const dVoc = (prev.voc ?? 0) - (entry.voc ?? 0);
  const dNo2 = (prev.no2 ?? 0) - (entry.no2 ?? 0);
  return {
    dropped: dVoc >= VOC_NO2_DROP_THRESHOLD || dNo2 >= VOC_NO2_DROP_THRESHOLD,
    rose:    -dVoc >= VOC_NO2_DROP_THRESHOLD || -dNo2 >= VOC_NO2_DROP_THRESHOLD,
  };
}

function getConsecutiveState(deviceId) {
  if (!predictionStore._consecutiveState) predictionStore._consecutiveState = {};
  if (!predictionStore._consecutiveState[deviceId]) {
    predictionStore._consecutiveState[deviceId] = { lastScent: null, count: 0 };
  }
  return predictionStore._consecutiveState[deviceId];
}

function forceNoScentPrediction() {
  return {
    finalScent: 'no_scent',
    finalConfidence: 1.0,
    finalTopPredictions: [{ scent: 'no_scent', confidence: 1.0 }],
  };
}

function applyConsecutiveLogic(deviceId, prediction, dropped) {
  const state = getConsecutiveState(deviceId);
  let { predicted_scent: finalScent, confidence: finalConfidence, top_predictions: finalTopPredictions } = prediction;
  let forcedNoScent = false;

  if (dropped) {
    ({ finalScent, finalConfidence, finalTopPredictions } = forceNoScentPrediction());
    forcedNoScent = true;
    state.lastScent = 'no_scent';
    state.count = 0;
  } else if (finalScent !== state.lastScent) {
    state.lastScent = finalScent;
    state.count = 1;
  } else {
    state.count += 1;
    if (state.count >= CONSECUTIVE_FORCE_LIMIT && finalScent !== 'no_scent') {
      ({ finalScent, finalConfidence, finalTopPredictions } = forceNoScentPrediction());
      forcedNoScent = true;
      state.lastScent = 'no_scent';
      state.count = 0;
    }
  }

  return { finalScent, finalConfidence, finalTopPredictions, forcedNoScent };
}

function resetConsecutiveOnRise(deviceId) {
  if (predictionStore._consecutiveState?.[deviceId]) {
    predictionStore._consecutiveState[deviceId].lastScent = null;
    predictionStore._consecutiveState[deviceId].count = 0;
  }
}

module.exports = {
  detectVocNo2Drop,
  applyConsecutiveLogic,
  resetConsecutiveOnRise,
};
