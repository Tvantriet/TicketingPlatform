#!/bin/bash
# Updates K8s deployment manifests with new image tags

set -e

SERVICE=$1
IMAGE_TAG=$2
REGISTRY=${REGISTRY:-"ghcr.io"}
IMAGE_PREFIX=${IMAGE_PREFIX:-"your-org/ticketing"}

if [ -z "$SERVICE" ] || [ -z "$IMAGE_TAG" ]; then
  echo "Usage: $0 <service-name> <image-tag>"
  echo "Example: $0 eventservice v1.0.0"
  exit 1
fi

# Map service names to deployment files
case $SERVICE in
  eventservice)
    DEPLOYMENT_FILE="EventService/deployment.yaml"
    ;;
  bookingservice)
    DEPLOYMENT_FILE="BookingService/deployment.yaml"
    ;;
  mockpaymentservice)
    DEPLOYMENT_FILE="MockPaymentService/deployment.yaml"
    ;;
  *)
    echo "Unknown service: $SERVICE"
    exit 1
    ;;
esac

# Update image in deployment file using yq or sed
if command -v yq &> /dev/null; then
  yq eval ".spec.template.spec.containers[0].image = \"${REGISTRY}/${IMAGE_PREFIX}-${SERVICE}:${IMAGE_TAG}\"" -i "$DEPLOYMENT_FILE"
else
  # Fallback to sed if yq not available
  sed -i.bak "s|image:.*$SERVICE.*|image: ${REGISTRY}/${IMAGE_PREFIX}-${SERVICE}:${IMAGE_TAG}|g" "$DEPLOYMENT_FILE"
fi

echo "Updated $DEPLOYMENT_FILE with image tag $IMAGE_TAG"

