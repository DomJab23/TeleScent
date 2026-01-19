# TeleScent Architecture Presentation Script
## 2-Minute Presentation

---

### Introduction (15 seconds)

"Hello everyone! Today I'll be presenting TeleScent, an intelligent scent detection system that combines IoT sensors with machine learning to classify and analyze environmental odors in real-time. Let me walk you through our system architecture."

---

### Slide 1: User Interface Layer (25 seconds)

"Starting with the user experience, TeleScent features a modern React-based frontend that provides four key interfaces:

- A **Dashboard** for real-time monitoring of sensor readings and predictions
- An **ML Console** where users can view model performance and insights
- A **Sensor Data View** for exploring historical data and trends
- And a secure **Authentication system** for user management

The interface is built with Material-UI, offering responsive design and real-time updates, making it accessible from any device with a web browser."

---

### Slide 2: Backend & Intelligence Layer (35 seconds)

"The brain of our system consists of two critical components:

First, our **Express.js backend** running on port 5001 handles all API requests. It implements:
- RESTful endpoints for data operations
- JWT-based authentication for security
- Comprehensive data validation
- And it's fully containerized with Docker for easy deployment

Second, our **Python ML service** performs the actual scent detection. We've trained two models:
- A full 6-sensor pipeline using VOC, NOx, NO2, Ethanol, and other chemical sensors
- And a simplified 2-sensor model for resource-constrained environments

Both models achieve over 95% accuracy and provide real-time predictions through a simple JSON interface. The backend communicates with the ML service via subprocess calls, keeping the architecture modular and maintainable."

---

### Slide 3: Data & IoT Layer (30 seconds)

"At the foundation of TeleScent, we have our data infrastructure and IoT integration:

Our **SQLite database** stores everything - user accounts, sensor readings, and prediction results. We use Sequelize ORM for clean, maintainable database operations.

For data science workflows, we export to **CSV files** which feed into our model training pipeline.

On the IoT side, **ESP32 microcontrollers** equipped with multi-gas sensors continuously stream data to our backend. These sensors measure VOC, NOx, NO2, ethanol, temperature, and humidity.

To make the system accessible from anywhere, we use **Ngrok tunnels** to expose our local backend to the internet, enabling remote sensor deployments and webhook integrations."

---

### Conclusion (15 seconds)

"In summary, TeleScent is a complete end-to-end solution: from physical sensors detecting scents, through machine learning classification, to a beautiful web interface for monitoring and analysis. The modular architecture ensures scalability, and the containerized deployment makes it production-ready. Thank you!"

---

## Key Points to Emphasize

1. **End-to-end solution**: Hardware → ML → Web Interface
2. **Modular design**: Each layer is independent and replaceable
3. **Production-ready**: Docker, authentication, real-time processing
4. **High accuracy**: 95%+ ML model performance
5. **Scalable**: Can handle multiple sensor deployments

## Timing Breakdown
- Introduction: 15s
- Slide 1 (Frontend): 25s
- Slide 2 (Backend/ML): 35s
- Slide 3 (Data/IoT): 30s
- Conclusion: 15s
- **Total: 2 minutes**

## Tips for Delivery
- Speak clearly and at a moderate pace
- Point to relevant components on the diagram as you mention them
- Maintain eye contact with the audience
- Use hand gestures to emphasize key points
- Be prepared for questions about specific technologies
- Have backup slides ready with technical details if needed
