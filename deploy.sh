#!/bin/bash
# TeleScent - Google Cloud Run Deployment Script
# Usage: ./deploy.sh [project-id]
# Example: ./deploy.sh my-telescent-project

set -e

GCLOUD=$(which gcloud)
PROJECT_ID="${1:-telescent}"
REGION="europe-west1"
SERVICE_NAME="telescent"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# ── Checks ────────────────────────────────────────────────────────────────────

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./deploy.sh <project-id>"
  echo ""
  echo "To create a new project:"
  echo "  1. Go to https://console.cloud.google.com"
  echo "  2. Create a new project and copy the project ID"
  echo "  3. Run: ./deploy.sh <your-project-id>"
  exit 1
fi

echo "🚀 Deploying TeleScent to Google Cloud Run"
echo "   Project : $PROJECT_ID"
echo "   Region  : $REGION"
echo "   Service : $SERVICE_NAME"
echo ""

# ── Auth & project setup ──────────────────────────────────────────────────────

echo "🔐 Using existing Google Cloud credentials..."
# $GCLOUD auth login  # Already logged in

$GCLOUD config set project "$PROJECT_ID"

echo "⚙️  Enabling required APIs (this may take a minute)..."
$GCLOUD services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  --project="$PROJECT_ID"

# ── Build & push image ────────────────────────────────────────────────────────

echo ""
echo "🔨 Building Docker image with Cloud Build..."
echo "   (uploads source and builds in the cloud - no Docker needed locally)"
$GCLOUD builds submit \
  --tag "$IMAGE_NAME" \
  --project="$PROJECT_ID" \
  --timeout=20m \
  .

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────

echo ""
echo "☁️  Deploying to Cloud Run..."
$GCLOUD run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 5001 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --timeout 60 \
  --set-env-vars "NODE_ENV=production,DOCKER_ENV=true" \
  --project="$PROJECT_ID"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "✅ Deployment complete!"
echo ""
SERVICE_URL=$($GCLOUD run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")
echo "🌐 Your app is live at: $SERVICE_URL"
echo ""
echo "⚠️  Note: SQLite data resets on each container restart."
echo "   For persistent data, see README for Cloud SQL setup."
