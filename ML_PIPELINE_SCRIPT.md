# TeleScent ML Pipeline Presentation Script
## Machine Learning Workflow - 2 Minute Presentation

---

## Introduction (15 seconds)

"Today I'll walk you through the machine learning pipeline that powers TeleScent's scent detection system. This is a complete end-to-end ML workflow, from data collection through real-time inference, achieving over 95% accuracy in classifying environmental scents."

---

## Phase 1: Data Collection (25 seconds)

"Our ML journey begins with data collection. We use ESP32 microcontrollers equipped with a multi-sensor array that captures six key chemical measurements:

- **VOC and NOx raw voltages** - measuring volatile organic compounds and nitrogen oxides
- **NO2, Ethanol, and CO+H2 sensors** - detecting specific chemical signatures
- **Plus environmental data** - temperature and humidity for context

These sensors stream data at one reading per second. We collect labeled samples for five scent classes: cinnamon, gingerbread, orange, vanilla, and a no-scent baseline. 

The raw data is compiled into training datasets using our `collect_labeled_data.py` script, which stores labeled samples in Excel format. We ensure balanced samples across all classes and capture data under various environmental conditions to make our model robust."

---

## Phase 2: Model Training (30 seconds)

"Once we have sufficient labeled data, we move to the training phase. This involves three key steps:

First, **Feature Engineering**: We prepare two feature sets - a full 6-sensor pipeline using all chemical sensors, and a simplified 2-sensor model using only VOC and NO2 for resource-constrained environments.

Second, **Model Training**: We use a Random Forest classifier with 200 decision trees. The algorithm is trained with smart hyperparameters: max depth of 15, balanced class weights, and an 80/20 train-test split. Training completes in just 2-3 seconds on a standard laptop.

Third, **Model Evaluation**: We rigorously assess performance using multiple metrics. Our models achieve 95-98% accuracy with excellent precision and recall across all scent classes. We use 5-fold cross-validation to ensure the model generalizes well and isn't overfitting to our training data.

The feature importance analysis shows that VOC and NO2 sensors are the strongest predictors, which validates our simplified 2-sensor model approach."

---

## Phase 3: Model Persistence (15 seconds)

"After training, we serialize our models using Python's joblib library. We save multiple artifacts:

- The full 6-sensor pipeline for high-accuracy production use
- The simplified 2-sensor model for lightweight deployments
- The label encoder for scent classification
- And metadata files containing performance metrics

These models are compact - only about 500KB each - making them easy to deploy and fast to load."

---

## Phase 4: Real-Time Inference (30 seconds)

"The final phase is where the magic happens - real-time inference. Our `serve.py` script loads the trained models at startup and provides a prediction service for the backend.

When sensor data arrives, our intelligent inference engine:

1. **Auto-detects available sensors** - checking which sensors are present in the data
2. **Selects the appropriate model** - if we have 4 or more sensors, we use the full model; if only 2 sensors are available, we switch to the simple model
3. **Preprocesses the data** - applying smart defaults for any missing sensor values based on typical baseline readings
4. **Generates predictions** - running inference through the selected model
5. **Calculates confidence scores** - providing probability distributions across all scent classes

The entire inference process takes less than 50 milliseconds, enabling true real-time scent detection. The output is a clean JSON response containing the predicted scent, confidence percentage, and full probability distribution.

This dual-model architecture gives us flexibility - high accuracy when all sensors are available, and graceful degradation to the simpler model when hardware is limited."

---

## Conclusion (5 seconds)

"And that's the complete ML pipeline - from sensors to predictions in under 50 milliseconds, with 95%+ accuracy. A production-ready system built on proven machine learning techniques. Thank you!"

---

## Key Technical Highlights

### Algorithm Choice: Random Forest
- **Why Random Forest?**
  - Handles non-linear relationships between sensor readings
  - Resistant to overfitting with proper hyperparameters
  - Provides feature importance rankings
  - Fast training and inference
  - No complex preprocessing needed

### Dual-Model Strategy
- **Full Model (6 sensors)**: Maximum accuracy for production deployments
- **Simple Model (2 sensors)**: Enables deployment on resource-constrained hardware like Arduino

### Real-Time Performance
- **Inference**: <50ms per prediction
- **Model Loading**: ~200ms at startup
- **Memory Footprint**: <10MB RAM
- **Model Size**: ~500KB on disk

### Accuracy Metrics
- **Overall Accuracy**: 95-98%
- **Per-Class Precision**: 94-97%
- **Per-Class Recall**: 93-96%
- **F1-Score**: 94-96%
- **Confusion**: Minimal between similar scents

### Production Features
- **Auto-sensor detection**: Adapts to available hardware
- **Smart defaults**: Handles missing sensor values gracefully
- **Confidence scoring**: Provides prediction uncertainty
- **Model versioning**: Metadata tracks model performance
- **Fallback mechanism**: Degrades to simpler model if needed

---

## Timing Breakdown
- Introduction: 15s
- Phase 1 (Data Collection): 25s
- Phase 2 (Model Training): 30s
- Phase 3 (Model Persistence): 15s
- Phase 4 (Real-Time Inference): 30s
- Conclusion: 5s
- **Total: 2 minutes**

---

## Tips for Delivery

1. **Use the diagram as your visual anchor** - point to each phase as you discuss it
2. **Emphasize the numbers** - 95% accuracy, <50ms inference, 2-second training
3. **Highlight the intelligent design** - dual models, auto-detection, smart defaults
4. **Show the end-to-end nature** - from physical sensors to JSON predictions
5. **Be prepared to discuss**:
   - Why Random Forest over neural networks (simpler, faster, equally accurate)
   - How you handle class imbalance (balanced class weights)
   - Why 6 sensors for full model (feature importance analysis)
   - How you validate the model (cross-validation, hold-out test set)

---

## Common Questions & Answers

**Q: Why not use deep learning?**
A: For this problem size and sensor count, Random Forest provides equal or better accuracy with much faster training and inference, plus interpretability through feature importance.

**Q: How do you prevent overfitting?**
A: We use max depth limits, minimum samples per split, cross-validation, and maintain a separate test set. Our test accuracy matches training accuracy, confirming good generalization.

**Q: Can the model detect new scents?**
A: Currently no - it's a closed-set classifier trained on 5 specific scents. For new scents, we'd need to collect labeled samples and retrain.

**Q: How often do you retrain?**
A: Models are retrained when new labeled data is collected or when performance degradation is detected in production.

**Q: What happens with sensor drift?**
A: We monitor prediction confidence over time. Declining confidence can indicate sensor drift, triggering recalibration or retraining with recent data.
