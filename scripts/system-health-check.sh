#!/bin/bash

# System Health Check Script
# This script checks if essential services are running

# List of services to check
SERVICES=("postgresql" "redis" "nginx")

# Function to check service status
check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
    fi
}

# Main execution
for service in "${SERVICES[@]}"; do
    check_service "$service"
done

exit 0